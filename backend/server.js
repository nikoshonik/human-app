// ─────────────────────────────────────────
//  Human App — Backend API
//  Node.js + Express · Deploy en Railway
//  Auth: Supabase JWT (verificado en cada request)
// ─────────────────────────────────────────
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// La anon key es pública por diseño (Supabase la documenta así y va embebida
// en cualquier cliente JS). Hardcoded como fallback para no depender de la
// env var en Railway. Si se rota, se sobreescribe con la env var.
const SUPABASE_ANON_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZHR6eG96d2doZHVwZXVyYnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTM5MzUsImV4cCI6MjA5NDk2OTkzNX0.9lY_zX1yK4st6KIQK7L2Sl5MBiISpPdf6NSg0yIv1jY'

const SUPABASE_URL  = process.env.SUPABASE_URL || 'https://rmdtzxozwghdupeurbzx.supabase.co'
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY
const ANON_KEY      = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('❌ Falta SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY en .env')
  console.error('   El backend arranca igualmente, pero requireAuth fallará.')
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.options('*', cors({ origin: true, credentials: true }))
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// supabaseAdmin → solo para tareas que requieren bypass de RLS
// (background jobs internos como updateJarvisMemory / generateAndSaveDailyPlan)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

// Health check (público)
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Human App API' }))

// ─────────────────────────────────────────
// MIDDLEWARE: requireAuth
// Verifica el JWT del header Authorization: Bearer <token>
// y deja el user disponible en req.user y un cliente RLS en req.supabase
// ─────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return res.status(401).json({ error: 'No autorizado' })

    // Validar token contra Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'Sesión inválida' })

    req.user = data.user
    // Cliente Supabase con el JWT del usuario → todas las queries respetan RLS
    req.supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth:   { persistSession: false, autoRefreshToken: false }
    })
    next()
  } catch (err) {
    console.error('requireAuth error:', err.message)
    res.status(401).json({ error: 'No autorizado' })
  }
}

// ─────────────────────────────────────────
// POST /api/onboarding
// Guarda o actualiza el perfil del usuario autenticado
// ─────────────────────────────────────────
app.post('/api/onboarding', requireAuth, async (req, res) => {
  const {
    name, age, sex, identity, goal, symptoms, agentName,
    wake_time, sleep_time, stress_baseline, score_baseline, integrations
  } = req.body || {}

  // Validación blanda — el cliente debería ya enviar lo correcto, esto es defensa
  if (name && typeof name !== 'string')                   return res.status(400).json({ error: 'name debe ser string' })
  if (age != null && (typeof age !== 'number' || age < 13 || age > 120))
    return res.status(400).json({ error: 'age debe ser número entre 13 y 120' })
  if (sex && typeof sex !== 'string')                     return res.status(400).json({ error: 'sex debe ser string' })
  if (identity && typeof identity !== 'string')           return res.status(400).json({ error: 'identity debe ser string' })
  if (goal && typeof goal !== 'string')                   return res.status(400).json({ error: 'goal debe ser string' })
  if (symptoms && typeof symptoms !== 'object')           return res.status(400).json({ error: 'symptoms debe ser objeto' })
  if (agentName && typeof agentName !== 'string')         return res.status(400).json({ error: 'agentName debe ser string' })
  if (integrations && !Array.isArray(integrations))       return res.status(400).json({ error: 'integrations debe ser array' })

  try {
    const { error } = await req.supabase.from('profiles').upsert({
      id: req.user.id,
      email: req.user.email,
      name: name ? String(name).slice(0, 80) : null,
      age, sex, identity, goal, symptoms,
      agent_name: agentName ? String(agentName).slice(0, 40) : null,
      wake_time:        wake_time        || '07:00',
      sleep_time:       sleep_time       || '23:00',
      stress_baseline:  stress_baseline  || 3,
      score_baseline:   score_baseline   || 45,
      integrations:     integrations     || []
    })
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error('onboarding error:', err.message)
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// GET /api/user/me
// Devuelve perfil + últimos 30 tests + stats derivadas
// ─────────────────────────────────────────
app.get('/api/user/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    const { data: profile, error } = await req.supabase
      .from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error

    const { data: tests } = await req.supabase
      .from('daily_tests').select('*').eq('user_id', userId)
      .order('date', { ascending: false }).limit(30)

    const testList = tests || []
    const lastTest = testList[0] || null

    let daysActive = 1
    if (profile?.created_at) {
      const created = new Date(profile.created_at)
      const diff = Date.now() - created.getTime()
      daysActive = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
    }

    let streak = 0
    if (testList.length > 0) {
      const dateSet = new Set(testList.map(t => (t.date || '').slice(0, 10)))
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        if (dateSet.has(key)) streak++
        else if (i > 0) break
      }
    }

    res.json({
      profile: profile || { id: userId, email: req.user.email },
      lastTest,
      tests: testList,
      stats: { daysActive, streak, totalTests: testList.length }
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/daily-test
// Guarda el test del día y dispara plan en background
// ─────────────────────────────────────────
app.post('/api/daily-test', requireAuth, async (req, res) => {
  const {
    sleepQuality, sleepHours,
    stressLevel, stressPeak,
    nutritionQuality, mealsCount,
    sportIntensity, sportDuration
  } = req.body || {}

  // Validación tipos
  const validNum = (v) => v == null || (typeof v === 'number' && !Number.isNaN(v))
  const validStr = (v) => v == null || typeof v === 'string'
  if (!validNum(sleepQuality) || !validNum(sleepHours) ||
      !validNum(stressLevel) || !validNum(nutritionQuality) ||
      !validNum(mealsCount)  || !validNum(sportIntensity) ||
      !validNum(sportDuration)) {
    return res.status(400).json({ error: 'Campos numéricos del test inválidos' })
  }
  if (!validStr(stressPeak)) return res.status(400).json({ error: 'stressPeak debe ser string' })

  try {
    const userId = req.user.id

    const { data: savedTest, error } = await req.supabase
      .from('daily_tests')
      .upsert({
        user_id: userId,
        sleep_quality: sleepQuality, sleep_hours: sleepHours,
        stress_level: stressLevel, stress_peak: stressPeak,
        nutrition_quality: nutritionQuality, meals_count: mealsCount,
        sport_intensity: sportIntensity, sport_duration: sportDuration
      }, { onConflict: 'user_id,date' })
      .select().single()

    if (error) throw error

    // Plan en background (puede usar admin porque es proceso del servidor)
    generateAndSaveDailyPlan(userId, savedTest).catch(console.error)

    res.json({ ok: true, testId: savedTest?.id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// GET /api/daily-plan/me
// ─────────────────────────────────────────
app.get('/api/daily-plan/me', requireAuth, async (req, res) => {
  try {
    const { data: test } = await req.supabase
      .from('daily_tests').select('daily_plan, date').eq('user_id', req.user.id)
      .order('date', { ascending: false }).limit(1).maybeSingle()

    res.json({ plan: test?.daily_plan || null, date: test?.date || null })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// DELETE /api/user/me
// Borra la cuenta del usuario autenticado.
// FK ON DELETE CASCADE elimina perfil/tests/mensajes.
// ─────────────────────────────────────────
app.delete('/api/user/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    // Borrado en cascada de datos públicos (defensa adicional aunque haya FK CASCADE)
    await supabaseAdmin.from('chat_messages').delete().eq('user_id', userId)
    await supabaseAdmin.from('daily_tests').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    // Borrar el usuario de auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error('delete user error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/chat
// Jarvis con las 3 capas de memoria. userId del JWT, no del body.
// ─────────────────────────────────────────
app.post('/api/chat', requireAuth, async (req, res) => {
  const { message, context: clientCtx } = req.body
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Mensaje vacío' })
  }

  const userId = req.user.id

  try {
    const { data: profile } = await req.supabase
      .from('profiles').select('*').eq('id', userId).maybeSingle()

    let { data: recentTests } = await req.supabase
      .from('daily_tests').select('*').eq('user_id', userId)
      .order('date', { ascending: false }).limit(30)

    // Fallback: si la DB no devuelve test pero el cliente sí lo tiene, lo usamos
    if ((!recentTests || recentTests.length === 0) && clientCtx?.today) {
      recentTests = [{
        date:              clientCtx.today.date || new Date().toISOString().slice(0,10),
        sleep_quality:     clientCtx.today.sleep_quality,
        sleep_hours:       clientCtx.today.sleep_hours,
        stress_level:      clientCtx.today.stress_level,
        stress_peak:       clientCtx.today.stress_peak,
        nutrition_quality: clientCtx.today.nutrition_quality,
        meals_count:       clientCtx.today.meals_count,
        sport_intensity:   clientCtx.today.sport_intensity,
        sport_duration:    clientCtx.today.sport_duration
      }]
    }

    const { data: chatHistory } = await req.supabase
      .from('chat_messages').select('role, content').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(8)

    const orderedHistory = (chatHistory || []).reverse()
    const systemPrompt = buildSystemPrompt(profile, recentTests || [], clientCtx)

    // Saneamos el historial para la API de Anthropic: la conversación DEBE
    // empezar por 'user' y alternar user/assistant. Como el par user+assistant
    // se guarda con el mismo created_at, el orden de lectura puede venir
    // descolocado (assistant primero, o dos del mismo rol seguidos), lo que
    // rompía la llamada con un 500. Aquí lo normalizamos siempre.
    const convo = []
    for (const m of orderedHistory) {
      if (m.role !== 'user' && m.role !== 'assistant') continue
      if (convo.length === 0 && m.role !== 'user') continue          // debe empezar en 'user'
      if (convo.length && convo[convo.length - 1].role === m.role) {
        convo[convo.length - 1] = { role: m.role, content: m.content } // colapsa consecutivos del mismo rol
      } else {
        convo.push({ role: m.role, content: m.content })
      }
    }
    if (convo.length && convo[convo.length - 1].role === 'user') convo.pop() // evita 2 'user' seguidos

    const messages = [
      ...convo,
      { role: 'user', content: message }
    ]

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages
    })

    const reply = response.content[0].text

    // Guardar el intercambio con cliente del usuario (RLS aplica)
    await req.supabase.from('chat_messages').insert([
      { user_id: userId, role: 'user',      content: message },
      { user_id: userId, role: 'assistant', content: reply   }
    ])

    // Memoria de Jarvis: background con admin (el cliente puede haber terminado)
    updateJarvisMemory(userId, profile, recentTests || [], message, reply).catch(console.error)

    res.json({ reply })
  } catch (err) {
    console.error('chat error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// HELPER: system prompt
// ─────────────────────────────────────────
function buildSystemPrompt(profile, recentTests, clientCtx) {
  const name         = profile?.name        || clientCtx?.profile?.name        || 'usuario'
  const agentName    = profile?.agent_name  || 'Jarvis'
  const identity     = profile?.identity    || clientCtx?.profile?.identity    || 'atleta'
  const goal         = profile?.goal        || clientCtx?.profile?.goal        || 'rendir mejor'
  const age          = (profile?.age || clientCtx?.profile?.age) ? `${profile?.age || clientCtx?.profile?.age} años` : ''
  const wakeTime     = profile?.wake_time   || clientCtx?.profile?.wake_time   || null
  const sleepTime    = profile?.sleep_time  || clientCtx?.profile?.sleep_time  || null
  const jarvisMemory = profile?.jarvis_memory || ''

  const toneByIdentity = identity === 'founder'
    ? 'productividad, foco mental y gestión de energía como founder'
    : identity === 'atleta'
    ? 'rendimiento físico, recuperación atlética y progresión'
    : 'equilibrio entre rendimiento mental y físico'

  const trendsBlock = buildTrendsBlock(recentTests)
  const memoryBlock = jarvisMemory
    ? `\nLO QUE SÉ DE ${name.toUpperCase()} (memoria acumulada):\n${jarvisMemory}\n`
    : ''

  // Cuando el cliente nos da el body_battery calculado, lo incluimos explícito
  const todayCtx = clientCtx?.today || {}
  const bodyBattery = todayCtx.body_battery != null ? `${todayCtx.body_battery}%` : null
  const explicitTodayBlock = (bodyBattery || trendsBlock === '') && todayCtx.sleep_quality != null
    ? `\nESTADO DE HOY (datos del test diario que YA hizo):
- Body Battery: ${bodyBattery || 'calcular según los datos'}
- Sueño: ${todayCtx.sleep_quality}/5, ${todayCtx.sleep_hours}h
- Estrés: ${todayCtx.stress_level}/5${todayCtx.stress_peak ? ` (pico ${todayCtx.stress_peak})` : ''}
- Nutrición: ${todayCtx.nutrition_quality}/5, ${todayCtx.meals_count} comidas
- Deporte: ${todayCtx.sport_intensity}/5, ${todayCtx.sport_duration} min
- Rutina: dormir ${sleepTime || '23:00'} → despertar ${wakeTime || '07:00'}\n`
    : ''

  return `Eres ${agentName}, el agente personal de salud y rendimiento de ${name}${age ? ` (${age})` : ''}.

PERFIL:
- Identidad: ${identity}
- Objetivo: ${goal}
- Síntomas iniciales: ${JSON.stringify(profile?.symptoms || {})}
${memoryBlock}${trendsBlock}${explicitTodayBlock}
REGLAS CRÍTICAS:
- TIENES los datos del usuario arriba (Body Battery, sueño, estrés, nutrición, deporte). USALOS SIEMPRE.
- NUNCA digas "no lo sé", "no tengo datos", "necesitaría más métricas", "datos cardíacos" o algo similar. Los datos del test diario YA TE LOS DAN arriba. Responde con esos.
- Si te preguntan "cómo dormí", responde con los datos de sueño que tienes (calidad X/5, X horas). Si te preguntan "estoy recuperado", responde con Body Battery + sueño + estrés.
- Métricas avanzadas que NO tienes (HRV, frecuencia cardíaca, fases reales): nunca las menciones como falta. Trabaja con lo que sí tienes.

CÓMO ACTUAR:
- Responde SIEMPRE en español, en 2-4 oraciones, directo y accionable.
- Cita números concretos del usuario (ej: "con tu 71% y sueño 4/5, sí, vas recuperado").
- Si hay alertas (⚠️), priorízalas.
- Tono: ${toneByIdentity}.
- Trátalo como alguien que conoces bien, no como un chatbot genérico.`
}

function buildTrendsBlock(tests) {
  if (!tests || tests.length === 0) return ''

  const latest = tests[0]
  const count  = tests.length

  const avg = (key) => {
    const vals = tests.map(t => t[key]).filter(v => v != null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  }

  const last3      = tests.slice(0, 3)
  const poorSleep  = last3.length >= 3 && last3.every(t => t.sleep_quality <= 2)
  const highStress = last3.length >= 3 && last3.every(t => t.stress_level  >= 4)
  const poorNutr   = last3.length >= 3 && last3.every(t => t.nutrition_quality <= 2)
  const noSport    = last3.length >= 3 && last3.every(t => t.sport_intensity === 0 || t.sport_duration === 0)

  let block = `\nDATOS DE SALUD (últimos ${count} día${count > 1 ? 's' : ''}):\n`
  block += `- Hoy (${latest.date}): sueño ${latest.sleep_quality}/5 (${latest.sleep_hours}h), estrés ${latest.stress_level}/5, nutrición ${latest.nutrition_quality}/5, deporte ${latest.sport_intensity}/5 (${latest.sport_duration}min)\n`

  if (count >= 3) {
    block += `- Promedios ${count}d: sueño ${avg('sleep_quality')}/5 (${avg('sleep_hours')}h), estrés ${avg('stress_level')}/5, nutrición ${avg('nutrition_quality')}/5, deporte ${avg('sport_intensity')}/5\n`
  }

  if (poorSleep)  block += `⚠️ 3+ días seguidos con sueño de baja calidad.\n`
  if (highStress) block += `⚠️ 3+ días seguidos con estrés elevado.\n`
  if (poorNutr)   block += `⚠️ 3+ días seguidos con nutrición deficiente.\n`
  if (noSport)    block += `⚠️ 3+ días sin actividad deportiva.\n`

  return block
}

// ─────────────────────────────────────────
// BACKGROUND: actualizar memoria de Jarvis
// Usa admin porque corre tras devolver la respuesta
// ─────────────────────────────────────────
async function updateJarvisMemory(userId, profile, recentTests, userMessage, jarvisReply) {
  const currentMemory = profile?.jarvis_memory || ''
  const name          = profile?.name || 'el usuario'
  const trendsBlock   = buildTrendsBlock(recentTests)

  const prompt = `Eres el sistema de memoria de Jarvis, agente personal de ${name}.

MEMORIA ACTUAL:
${currentMemory || '(vacía — primera conversación)'}

DATOS DE SALUD RECIENTES:
${trendsBlock}

ÚLTIMA CONVERSACIÓN:
Usuario: ${userMessage}
Jarvis: ${jarvisReply}

Tu tarea: actualiza la memoria con cualquier insight nuevo, relevante y duradero sobre este usuario.
Incluye: patrones detectados, preferencias, bloqueos recurrentes, qué funciona, progreso, contexto personal importante.
NO incluyas: detalles triviales, lo que ya está en la memoria actual, datos temporales.

Si no hay nada nuevo relevante, devuelve la memoria actual sin cambios.

Devuelve SOLO el texto de la memoria actualizada (máximo 400 palabras), sin explicaciones ni formato extra.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })

    const updatedMemory = response.content[0].text.trim()

    if (updatedMemory !== currentMemory) {
      await supabaseAdmin.from('profiles')
        .update({ jarvis_memory: updatedMemory })
        .eq('id', userId)
    }
  } catch (err) {
    console.error('Error actualizando memoria de Jarvis:', err.message)
  }
}

// ─────────────────────────────────────────
// BACKGROUND: generar plan diario tras el test
// Usa admin para que corra aunque el request del cliente ya haya respondido
// ─────────────────────────────────────────
async function generateAndSaveDailyPlan(userId, todayTest) {
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('*').eq('id', userId).maybeSingle()

  const { data: recentTests } = await supabaseAdmin
    .from('daily_tests').select('*').eq('user_id', userId)
    .order('date', { ascending: false }).limit(7)

  const name         = profile?.name       || 'usuario'
  const agentName    = profile?.agent_name || 'Jarvis'
  const identity     = profile?.identity   || 'atleta'
  const goal         = profile?.goal       || 'rendir mejor'
  const jarvisMemory = profile?.jarvis_memory || ''
  const trendsBlock  = buildTrendsBlock(recentTests || [])

  const prompt = `Eres ${agentName}, agente personal de ${name}.

PERFIL: ${identity} · Objetivo: ${goal}
${jarvisMemory ? `LO QUE SÉ DE ${name.toUpperCase()}:\n${jarvisMemory}\n` : ''}
${trendsBlock}
TEST DE HOY (${todayTest.date}):
- Sueño: ${todayTest.sleep_quality}/5 (${todayTest.sleep_hours}h)
- Estrés: ${todayTest.stress_level}/5 (peor en: ${todayTest.stress_peak || 'no especificado'})
- Nutrición: ${todayTest.nutrition_quality}/5 (${todayTest.meals_count} comidas)
- Deporte: ${todayTest.sport_intensity}/5 (${todayTest.sport_duration}min)

Genera el plan personalizado de hoy para ${name}. Debe ser concreto, adaptado a cómo está hoy y a lo que sabes de él.

Estructura exacta (usa estos títulos):
ESTADO DE HOY: [1 frase que resuma cómo está y por qué]
FOCO PRINCIPAL: [la prioridad del día según sus datos]
ENTRENAMIENTO: [qué hacer o no hacer hoy, con intensidad concreta]
NUTRICIÓN: [2-3 recomendaciones específicas para hoy. Recomienda casi siempre cenar al menos 3 h antes de dormir y priorizar alimentos ricos en triptófano (pavo, huevos, lácteos, plátano, avena, frutos secos), explicando que ambas cosas mejoran la calidad del sueño]
RECUPERACIÓN: [lo más importante para recuperarse hoy. Incluye casi siempre reducir o bloquear la luz azul (pantallas, LED) al menos 1 h antes de dormir, explicando que favorece la melatonina y mejora la calidad del sueño. Recomienda también, normalmente después de entrenar, unos minutos de meditación y estiramientos para relajar el sistema nervioso]
MENSAJE DE JARVIS: [1 frase motivadora y personalizada]

Máximo 150 palabras en total. Directo, sin relleno.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    })

    const plan = response.content[0].text.trim()

    await supabaseAdmin.from('daily_tests')
      .update({ daily_plan: plan })
      .eq('id', todayTest.id)

  } catch (err) {
    console.error('Error generando plan diario:', err.message)
  }
}

// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Human API corriendo en :${PORT}`))
