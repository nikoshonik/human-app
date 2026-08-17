// ════════════════════════════════════════════════════════════════
//  Human App — Sender de Push (APNs para iOS + FCM para Android)
//  Coge las notificaciones push con push_sent_at NULL y push_token del user,
//  las envía a su móvil y marca push_sent_at (NO toca 'status', que pertenece
//  al ciclo de vida de la campanita in-app: leída/no leída).
//
//  Se ejecuta DESPUÉS del worker. En Railway: mismo cron, un par de minutos
//  después de notificationsWorker.js, o encadenado.
//
//  ⚠️  Requiere dispositivo real. NO funciona contra el simulador de iOS.
//      El emulador de Android SÍ recibe FCM si tiene Google Play Services.
//
//  Instalar librerías:   npm install @parse/node-apn google-auth-library
//
//  Variables de entorno:
//    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//    — iOS (APNs) —
//    APNS_KEY_P8         → contenido del archivo AuthKey_XXXX.p8 (texto)
//    APNS_KEY_ID         → Key ID (10 caracteres)
//    APNS_TEAM_ID        → Team ID: X6CDJ2W4XL
//    APNS_BUNDLE_ID      → com.nikoshonik.humanapp
//    APNS_PRODUCTION     → 'true' en producción
//    — Android (FCM) —
//    FCM_PROJECT_ID      → human-app-74a58
//    FCM_SERVICE_ACCOUNT → JSON COMPLETO de la cuenta de servicio de Firebase
//                          (Configuración del proyecto ▸ Cuentas de servicio ▸
//                           Generar nueva clave privada)
// ════════════════════════════════════════════════════════════════

// El backend usa ES modules ("type":"module" en package.json) → import, no require.
import { createClient } from '@supabase/supabase-js';
import apn from '@parse/node-apn';
import { GoogleAuth } from 'google-auth-library';

const supabase = createClient(
  process.env.SUPABASE_URL,
  // El servicio de Railway usa SUPABASE_SERVICE_KEY; aceptamos ambos nombres.
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ── APNs (iOS) ──────────────────────────────────────────────────
// El .p8 se guarda en APNS_KEY_P8. Algunos paneles (Railway incluido) almacenan
// los saltos de línea como "\n" literales → los normalizamos para node-apn.
const APNS_KEY = (process.env.APNS_KEY_P8 || '').replace(/\\n/g, '\n');

const apnProvider = APNS_KEY
  ? new apn.Provider({
      token: {
        key: APNS_KEY,
        keyId: process.env.APNS_KEY_ID,
        teamId: process.env.APNS_TEAM_ID,
      },
      production: process.env.APNS_PRODUCTION === 'true',
    })
  : null;

// ── FCM (Android) ───────────────────────────────────────────────
// FCM HTTP v1 pide un access token OAuth2 firmado con la cuenta de servicio.
// google-auth-library lo genera y lo cachea; aquí lo pedimos una vez por ejecución.
const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID || '';
let _fcmAuth = null;
function fcmAuth() {
  if (_fcmAuth) return _fcmAuth;
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw || !FCM_PROJECT_ID) return null;
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    console.error('[push] FCM_SERVICE_ACCOUNT no es un JSON válido');
    return null;
  }
  // Mismo detalle que con el .p8: la private_key puede llegar con "\n" literales.
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  _fcmAuth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  return _fcmAuth;
}

let _fcmToken = null;
async function fcmAccessToken() {
  if (_fcmToken) return _fcmToken;
  const auth = fcmAuth();
  if (!auth) return null;
  const client = await auth.getClient();
  const res = await client.getAccessToken();
  _fcmToken = res?.token || null;
  return _fcmToken;
}

// Devuelve { ok:true } o { ok:false, reason:'...' }
async function sendFcm(token, n, badge) {
  const accessToken = await fcmAccessToken();
  if (!accessToken) return { ok: false, reason: 'FCM_NOT_CONFIGURED' };

  // FCM exige que TODOS los valores de "data" sean strings.
  const data = {};
  for (const [k, v] of Object.entries({ ...(n.payload || {}), deliveryId: n.id, category: n.category })) {
    if (v !== null && v !== undefined) data[k] = String(v);
  }

  const body = {
    message: {
      token,
      notification: { title: n.title, body: n.body },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          notification_count: badge,
          // Abre la app al tocar la notificación (lo maneja Capacitor).
          click_action: 'FCM_PLUGIN_ACTIVITY',
        },
      },
      data,
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  const reason =
    err?.error?.details?.[0]?.errorCode || err?.error?.status || `HTTP_${res.status}`;
  return { ok: false, reason };
}

// Un token de FCM ya no vale: hay que borrarlo para no reintentar eternamente.
const FCM_TOKEN_MUERTO = ['UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'];
const APNS_TOKEN_MUERTO = ['BadDeviceToken', 'Unregistered'];

async function run() {
  const now = () => new Date().toISOString();

  // 1. Notificaciones push AÚN NO ENVIADAS.
  //    Se rastrea con push_sent_at (NO con status), para que el push se dispare
  //    aunque el usuario ya haya marcado la notificación como leída en la campanita.
  const { data: pending, error } = await supabase
    .from('notification_deliveries')
    .select('*')
    .eq('channel', 'push')
    .is('push_sent_at', null)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) { console.error('[push] error leyendo pendientes:', error); process.exit(1); }
  if (!pending?.length) { console.log('[push] nada que enviar'); return; }

  // 2. Tokens y plataforma de los users implicados
  const userIds = [...new Set(pending.map(n => n.user_id))];
  const { data: prefs } = await supabase
    .from('notification_prefs')
    .select('user_id, push_token, push_enabled, push_platform')
    .in('user_id', userIds);

  const destByUser = Object.fromEntries(
    (prefs || [])
      .filter(p => p.push_enabled !== false && p.push_token)
      .map(p => [p.user_id, { token: p.push_token, platform: p.push_platform || 'ios' }])
  );

  // 3. Badge real: nº de notificaciones no leídas por user.
  const { data: unreadRows } = await supabase
    .from('notification_deliveries')
    .select('user_id')
    .in('user_id', userIds)
    .neq('status', 'read');
  const unreadByUser = {};
  for (const r of (unreadRows || [])) unreadByUser[r.user_id] = (unreadByUser[r.user_id] || 0) + 1;

  let sentIos = 0, sentAndroid = 0, skipped = 0, failed = 0;

  for (const n of pending) {
    const dest = destByUser[n.user_id];
    if (!dest) {
      // Sin token → marcar push_sent_at para no reprocesar (NO se toca status).
      await supabase.from('notification_deliveries')
        .update({ push_sent_at: now() }).eq('id', n.id);
      skipped++;
      continue;
    }

    const badge = unreadByUser[n.user_id] || 1;

    try {
      if (dest.platform === 'android') {
        // ── Android → FCM ──
        const r = await sendFcm(dest.token, n, badge);
        if (r.ok) {
          await supabase.from('notification_deliveries')
            .update({ push_sent_at: now(), sent_at: now() }).eq('id', n.id);
          sentAndroid++;
        } else {
          // Si FCM no está configurado, NO marcamos push_sent_at: así los avisos
          // quedan pendientes y salen solos en cuanto se añadan las credenciales.
          if (r.reason === 'FCM_NOT_CONFIGURED') {
            console.warn('[push] FCM sin configurar; se deja pendiente', n.id);
          } else {
            await supabase.from('notification_deliveries')
              .update({ push_sent_at: now(), payload: { ...(n.payload || {}), fcm_error: r.reason } })
              .eq('id', n.id);
            if (FCM_TOKEN_MUERTO.includes(r.reason)) {
              await supabase.from('notification_prefs')
                .update({ push_token: null }).eq('user_id', n.user_id);
            }
          }
          failed++;
        }
      } else {
        // ── iOS → APNs ──
        if (!apnProvider) { console.warn('[push] APNs sin configurar; se deja pendiente', n.id); failed++; continue; }
        const note = new apn.Notification();
        note.topic = process.env.APNS_BUNDLE_ID;
        note.alert = { title: n.title, body: n.body };
        note.sound = 'default';
        note.badge = badge;
        note.payload = { ...(n.payload || {}), deliveryId: n.id, category: n.category };

        const res = await apnProvider.send(note, dest.token);
        if (res.sent.length) {
          await supabase.from('notification_deliveries')
            .update({ push_sent_at: now(), sent_at: now() }).eq('id', n.id);
          sentIos++;
        } else {
          const reason = res.failed?.[0]?.response?.reason || 'unknown';
          await supabase.from('notification_deliveries')
            .update({ push_sent_at: now(), payload: { ...(n.payload || {}), apns_error: reason } })
            .eq('id', n.id);
          failed++;
          if (APNS_TOKEN_MUERTO.includes(reason)) {
            await supabase.from('notification_prefs')
              .update({ push_token: null }).eq('user_id', n.user_id);
          }
        }
      }
    } catch (e) {
      // Error transitorio (red/APNs/FCM) → NO marcamos push_sent_at, se reintenta.
      console.error('[push] error enviando', n.id, e?.message);
      failed++;
    }
  }

  console.log(`[push] iOS=${sentIos} Android=${sentAndroid} omitidas=${skipped} fallidas=${failed}`);
}

run()
  .then(() => { apnProvider?.shutdown(); process.exit(0); })
  .catch(err => { console.error('[push] fatal:', err); process.exit(1); });
