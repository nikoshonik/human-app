// ─────────────────────────────────────────
//  Human App — Backend API
//  Node.js + Express · Deploy en Railway
// ─────────────────────────────────────────
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ─────────────────────────────────────────
// POST /api/register
// ─────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true
    })
    if (error) throw error
    await supabase.from('profiles').insert({ id: data.user.id, email })
    res.json({ userId: data.user.id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/onboarding
// ─────────────────────────────────────────
app.post('/api/onboarding', async (req, res) => {
  const { userId, name, age, sex, identity, goal, symptoms, agentName } = req.body
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: userId, name, age, sex, identity, goal, symptoms, agent_name: agentName
    })
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// GET /api/user/:id
// ─────────────────────────────────────────
app.get('/api/user/:id', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles').select('*').eq('id', req.params.id).single()
    if (error) throw error

    const { data: lastTest } = await supabase
      .from('daily_tests').select('*').eq('user_id', req.params.id)
      .order('date', { ascending: false }).limit(1).single()

    res.json({ profile, lastTest: lastTest || null })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/daily-test
// Guarda el test y genera el plan del día
// ─────────────────────────────────────────
app.post('/api/daily-test', async (req, res) => {
  const {
    userId, sleepQuality, sleepHours,
    stressLevel, stressPeak,
    nutritionQuality, mealsCount,
    sportIntensity, sportDuration
  } = req.body

  try {
    // 1. Guardar el test
    const { data: savedTest, error } = await supabase
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

    // 2. Generar plan diario en background (no bloqueamos la respuesta)
    generateAndSaveDailyPlan(userId, savedTest).catch(console.error)

    res.json({ ok: true, testId: savedTest?.id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// GET /api/daily-plan/:userId
// Devuelve el plan del día generado
// ─────────────────────────────────────────
app.get('/api/daily-plan/:userId', async (req, res) => {
  try {
    const { data: test } = await supabase
      .from('daily_tests').select('daily_plan, date').eq('user_id', req.params.userId)
      .order('date', { ascending: false }).limit(1).single()

    res.json({ plan: test?.daily_plan || null, date: test?.date || null })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/chat
// Jarvis con las 3 capas de memoria
// ─────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { userId, message } = req.body

  try {
    // CAPA 1: Perfil + memoria acumulada de Jarvis
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', userId).single()

    // CAPA 2: Últimos 30 días de tests (tendencias)
    const { data: recentTests } = await supabase
      .from('daily_tests').select('*').eq('user_id', userId)
      .order('date', { ascending: false }).limit(30)

    // CAPA 3: Últimos 8 mensajes (continuidad de conversación)
    const { data: chatHistory } = await supabase
      .from('chat_messages').select('role, content').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(8)

    const orderedHistory = (chatHistory || []).reverse()

    // System prompt con las 3 capas
    const systemPrompt = buildSystemPrompt(profile, recentTests || [])

    const messages = [
      ...orderedHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ]

    // Llamar a Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages
    })

    const reply = response.content[0].text

    // Guardar el intercambio
    await supabase.from('chat_messages').insert([
      { user_id: userId, role: 'user',      content: message },
      { user_id: userId, role: 'assistant', content: reply   }
    ])

    // Actualizar memoria de Jarvis en background
    updateJarvisMemory(userId, profile, recentTests || [], message, reply).catch(console.error)

    res.json({ reply })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// HELPER: Construir system prompt completo
// ─────────────────────────────────────────
function buildSystemPrompt(profile, recentTests) {
  const name         = profile?.name        || 'usuario'
  const agentName    = profile?.agent_name  || 'Jarvis'
  const identity     = profile?.identity    || 'atleta'
  const goal         = profile?.goal        || 'rendir mejor'
  const age          = profile?.age         ? `${profile.age} años` : ''
  const jarvisMemory = profile?.jarvis_memory || ''

  const toneByIdentity = identity === 'founder'
    ? 'productividad, foco mental y gestión de energía como founder'
    : identity === 'atleta'
    ? 'rendimiento físico, recuperación atlética y progresión'
    : 'equilibrio entre rendimiento mental y físico'

  // Tendencias y alertas de tests
  const trendsBlock = buildTrendsBlock(recentTests)

  // Memoria acumulada (si existe)
  const memoryBlock = jarvisMemory
    ? `\nLO QUE SÉ DE ${name.toUpperCase()} (memoria acumulada):\n${jarvisMemory}\n`
    : ''

  return `Eres ${agentName}, el agente personal de salud y rendimiento de ${name}${age ? ` (${age})` : ''}.

PERFIL:
- Identidad: ${identity}
- Objetivo: ${goal}
- Síntomas iniciales: ${JSON.stringify(profile?.symptoms || {})}
${memoryBlock}${trendsBlock}
CÓMO ACTUAR:
- Responde SIEMPRE en español
- Máximo 3-4 oraciones — directo y accionable
- Usa los datos reales del usuario para personalizar cada respuesta
- Si hay alertas (⚠️), priorízalas
- Si conoces patrones del usuario, úsalos para dar mejores consejos
- Tono: ${toneByIdentity}
- Eres su agente personal, no un chatbot genérico — trátalo como alguien que conoces bien`
}

// ─────────────────────────────────────────
// HELPER: Bloque de tendencias y alertas
// ─────────────────────────────────────────
function buildTrendsBlock(tests) {
  if (!tests || tests.length === 0) return ''

  const latest = tests[0]
  const count  = tests.length

  const avg = (key) => {
    const vals = tests.map(t => t[key]).filter(v => v != null)
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  }

  // Rachas negativas (últimos 3 días)
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
// HELPER: Actualizar memoria acumulada
// Se ejecuta en background tras cada chat
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

    // Solo guardar si cambió algo
    if (updatedMemory !== currentMemory) {
      await supabase.from('profiles')
        .update({ jarvis_memory: updatedMemory })
        .eq('id', userId)
    }
  } catch (err) {
    console.error('Error actualizando memoria de Jarvis:', err.message)
  }
}

// ─────────────────────────────────────────
// HELPER: Generar plan diario automático
// Se ejecuta tras guardar el test del día
// ─────────────────────────────────────────
async function generateAndSaveDailyPlan(userId, todayTest) {
  // Perfil + memoria + últimos 7 tests
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', userId).single()

  const { data: recentTests } = await supabase
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
NUTRICIÓN: [2-3 recomendaciones específicas para hoy]
RECUPERACIÓN: [lo más importante para recuperarse hoy]
MENSAJE DE JARVIS: [1 frase motivadora y personalizada]

Máximo 150 palabras en total. Directo, sin relleno.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    })

    const plan = response.content[0].text.trim()

    await supabase.from('daily_tests')
      .update({ daily_plan: plan })
      .eq('id', todayTest.id)

  } catch (err) {
    console.error('Error generando plan diario:', err.message)
  }
}

// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Human API corriendo en :${PORT}`))
