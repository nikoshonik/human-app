// ════════════════════════════════════════════════════════════════
//  Human App — Sender de Push (APNs)
//  Coge las notificaciones push con push_sent_at NULL y push_token del user,
//  las envía a su iPhone vía APNs y marca push_sent_at (NO toca 'status',
//  que pertenece al ciclo de vida de la campanita in-app: leída/no leída).
//
//  Se ejecuta DESPUÉS del worker. Sugerencia en Railway: mismo cron,
//  un par de minutos después de notificationsWorker.js, o encadenado.
//
//  ⚠️  Requiere un dispositivo real + cuenta Apple Developer.
//      NO funciona contra el simulador.
//
//  Instalar la librería:   npm install @parse/node-apn
//
//  Variables de entorno necesarias:
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//    APNS_KEY_P8         → contenido del archivo AuthKey_XXXX.p8 (texto)
//    APNS_KEY_ID         → Key ID (10 caracteres, de Apple Developer → Keys)
//    APNS_TEAM_ID        → Team ID: X6CDJ2W4XL
//    APNS_BUNDLE_ID      → com.nikoshonik.humanapp
//    APNS_PRODUCTION     → 'true' en producción (build de App Store / TestFlight)
// ════════════════════════════════════════════════════════════════

// El backend usa ES modules ("type":"module" en package.json) → import, no require.
import { createClient } from '@supabase/supabase-js';
import apn from '@parse/node-apn';

const supabase = createClient(
  process.env.SUPABASE_URL,
  // El servicio de Railway usa SUPABASE_SERVICE_KEY; aceptamos ambos nombres.
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// El .p8 se guarda en la env var APNS_KEY_P8. Algunos paneles (Railway incluido)
// pueden almacenar los saltos de línea como "\n" literales → los normalizamos a
// saltos reales para que node-apn pueda parsear la clave PKCS8.
const APNS_KEY = (process.env.APNS_KEY_P8 || '').replace(/\\n/g, '\n');

const apnProvider = new apn.Provider({
  token: {
    key: APNS_KEY,                       // contenido del .p8 (con saltos de línea reales)
    keyId: process.env.APNS_KEY_ID,      // H5ZMCDZRFX
    teamId: process.env.APNS_TEAM_ID,    // X6CDJ2W4XL
  },
  production: process.env.APNS_PRODUCTION === 'true',
});

async function run() {
  // 1. Notificaciones push AÚN NO ENVIADAS por APNs.
  //    Se rastrea con push_sent_at (NO con status), para que el push se dispare
  //    aunque el usuario ya haya marcado la notificación como leída en la campanita
  //    in-app. Antes competían por 'status' y la in-app ganaba la carrera → 0 push.
  const now = () => new Date().toISOString();
  const { data: pending, error } = await supabase
    .from('notification_deliveries')
    .select('*')
    .eq('channel', 'push')
    .is('push_sent_at', null)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) { console.error('[push] error leyendo pendientes:', error); process.exit(1); }
  if (!pending?.length) { console.log('[push] nada que enviar'); return; }

  // 2. Tokens de los users implicados
  const userIds = [...new Set(pending.map(n => n.user_id))];
  const { data: prefs } = await supabase
    .from('notification_prefs')
    .select('user_id, push_token, push_enabled')
    .in('user_id', userIds);

  const tokenByUser = Object.fromEntries(
    (prefs || [])
      .filter(p => p.push_enabled !== false && p.push_token)
      .map(p => [p.user_id, p.push_token])
  );

  let sent = 0, skipped = 0, failed = 0;

  for (const n of pending) {
    const token = tokenByUser[n.user_id];
    if (!token) {
      // Sin token → marcar push_sent_at para no reprocesar (NO se toca status).
      await supabase.from('notification_deliveries')
        .update({ push_sent_at: now() }).eq('id', n.id);
      skipped++;
      continue;
    }

    const note = new apn.Notification();
    note.topic = process.env.APNS_BUNDLE_ID;
    note.alert = { title: n.title, body: n.body };
    note.sound = 'default';
    note.badge = 1;
    note.payload = { ...(n.payload || {}), deliveryId: n.id, category: n.category };

    try {
      const res = await apnProvider.send(note, token);
      if (res.sent.length) {
        // Marcamos push_sent_at + sent_at, sin tocar status (lo gestiona la in-app).
        await supabase.from('notification_deliveries')
          .update({ push_sent_at: now(), sent_at: now() })
          .eq('id', n.id);
        sent++;
      } else {
        const reason = res.failed?.[0]?.response?.reason || 'unknown';
        await supabase.from('notification_deliveries')
          .update({ push_sent_at: now(), payload: { ...(n.payload||{}), apns_error: reason } })
          .eq('id', n.id);
        failed++;
        // Token inválido → limpiarlo para no reintentar siempre
        if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
          await supabase.from('notification_prefs')
            .update({ push_token: null }).eq('user_id', n.user_id);
        }
      }
    } catch (e) {
      // Error transitorio (red/APNs) → NO marcamos push_sent_at para reintentar luego.
      console.error('[push] error enviando', n.id, e?.message);
      failed++;
    }
  }

  console.log(`[push] enviadas=${sent} omitidas=${skipped} fallidas=${failed}`);
}

run()
  .then(() => { apnProvider.shutdown(); process.exit(0); })
  .catch(err => { console.error('[push] fatal:', err); process.exit(1); });
