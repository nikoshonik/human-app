// ════════════════════════════════════════════════════════════════
//  Human App — Worker de Notificaciones
//  Evalúa las reglas de notification_rules contra los datos de cada
//  user, rellena la plantilla con SUS valores y crea la entrega.
//
//  Cómo se ejecuta en Railway:
//    A) Cron Job de Railway → comando: node backend/notificationsWorker.js
//       (recomendado: 1 vez por la mañana + 1 por la noche)
//    B) O un setInterval dentro de server.js (menos limpio)
//
//  Requiere variables de entorno (las mismas que ya usas):
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//  ⚠️  USA LA SERVICE ROLE KEY (no la anon) para poder escribir saltando RLS.
// ════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ── Operadores ────────────────────────────────────────────────────
const OPS = {
  '<':  (a, b) => a <  b,
  '<=': (a, b) => a <= b,
  '>':  (a, b) => a >  b,
  '>=': (a, b) => a >= b,
  '=':  (a, b) => a === b,
  '!=': (a, b) => a !== b,
};

// Calcula el umbral efectivo: fijo, o derivado de un baseline del perfil
function resolveThreshold(rule, profile) {
  if (rule.baseline_field && rule.baseline_delta_pct != null) {
    const base = Number(profile[rule.baseline_field] ?? 0);
    return base * (1 + Number(rule.baseline_delta_pct));
  }
  return Number(rule.threshold);
}

// Evalúa una regla para un user. Devuelve { fired, value }
function evaluateRule(rule, { rows, profile }) {
  const op = OPS[rule.operator];
  const threshold = resolveThreshold(rule, profile);
  const vals = rows
    .map(r => Number(r[rule.metric]))
    .filter(v => !Number.isNaN(v));

  switch (rule.aggregation) {
    case 'latest': {
      if (rows.length === 0) return { fired: false };
      const v = rule.source === 'profiles'
        ? Number(profile[rule.metric])
        : vals[0];
      return { fired: op(v, threshold), value: v };
    }
    case 'avg': {
      if (vals.length === 0) return { fired: false };
      const v = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { fired: op(v, threshold), value: Math.round(v * 10) / 10 };
    }
    case 'min':
      if (!vals.length) return { fired: false };
      return { fired: op(Math.min(...vals), threshold), value: Math.min(...vals) };
    case 'max':
      if (!vals.length) return { fired: false };
      return { fired: op(Math.max(...vals), threshold), value: Math.max(...vals) };
    case 'count_below': {
      const n = vals.filter(v => v < threshold).length;
      return { fired: n >= rule.min_occurrences, value: vals[0] };
    }
    case 'count_above': {
      const n = vals.filter(v => v > threshold).length;
      return { fired: n >= rule.min_occurrences, value: vals[0] };
    }
    case 'missing': {
      // No hay registro de daily_test con fecha de hoy
      const today = new Date().toISOString().slice(0, 10);
      const hasToday = rows.some(r => String(r.date || r.created_at || '').slice(0, 10) === today);
      return { fired: !hasToday };
    }
    default:
      return { fired: false };
  }
}

// Rellena {variables} de la plantilla con los datos del user
function render(template, ctx) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (ctx[k] != null ? ctx[k] : ''));
}

// ¿Estamos dentro de las horas de silencio del user?
function inQuietHours(prefs) {
  if (!prefs) return false;
  const now = new Date().toLocaleTimeString('en-GB', {
    hour12: false, timeZone: prefs.timezone || 'Europe/Madrid',
  }).slice(0, 5); // 'HH:MM'
  const { quiet_start: s, quiet_end: e } = prefs;
  // Rango que cruza medianoche (ej. 22:30 → 07:30)
  return s > e ? (now >= s || now < e) : (now >= s && now < e);
}

// ── Loop principal ────────────────────────────────────────────────
async function run() {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: rules }, { data: profiles }, { data: prefsAll }] = await Promise.all([
    supabase.from('notification_rules').select('*').eq('active', true),
    supabase.from('profiles').select('*'),
    supabase.from('notification_prefs').select('*'),
  ]);

  const prefsByUser = Object.fromEntries((prefsAll || []).map(p => [p.user_id, p]));
  let created = 0;

  for (const profile of profiles || []) {
    const prefs = prefsByUser[profile.id];
    if (prefs && prefs.push_enabled === false) continue;

    // Trae los daily_tests recientes del user una sola vez (máx ventana = 7)
    const { data: rows } = await supabase
      .from('daily_tests')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false })
      .limit(14);

    for (const rule of rules) {
      // Respeta categorías muteadas
      if (prefs?.muted_categories?.includes(rule.category)) continue;
      // Respeta horas de silencio (salvo reglas que no lo piden)
      if (rule.respect_quiet_hours && inQuietHours(prefs)) continue;

      const windowRows = (rows || []).slice(0, rule.window_days);
      const { fired, value } = evaluateRule(rule, { rows: windowRows, profile });
      if (!fired) continue;

      // Cooldown / dedupe: no repetir la misma regla el mismo día
      const dedupe_key = `${rule.key}:${today}`;
      const { data: existing } = await supabase
        .from('notification_deliveries')
        .select('id')
        .eq('user_id', profile.id)
        .eq('dedupe_key', dedupe_key)
        .maybeSingle();
      if (existing) continue;

      // Trae la plantilla y renderiza con los datos del user
      const { data: tpl } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('key', rule.template_key)
        .single();
      if (!tpl) continue;

      const ctx = {
        nombre: (profile.name || '').split(' ')[0] || 'crack',
        sleep_hours: value,
        sleep_quality: value,
        stress_level: value,
        score: value,
        meals_count: value,
        streak: profile.streak,
        days: rule.window_days,
      };

      const title = render(tpl.title_template, ctx);
      const body  = render(tpl.body_template, ctx);

      const { error } = await supabase.from('notification_deliveries').insert({
        user_id: profile.id,
        rule_key: rule.key,
        template_key: tpl.key,
        channel: rule.channel,
        category: rule.category,
        title,
        body,
        payload: { value, rule: rule.key },
        dedupe_key,
        status: 'pending',
      });
      if (!error) created++;
    }
  }

  console.log(`[notifications] ${created} entregas creadas — ${new Date().toISOString()}`);
  // 👉 Siguiente paso: un sender que coja status='pending' y las mande
  //    por Expo/FCM, luego marque status='sent'. Ver NOTIFICACIONES.md.
}

run().then(() => process.exit(0)).catch(err => {
  console.error('[notifications] error:', err);
  process.exit(1);
});
