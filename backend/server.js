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

// ── Clientes ──────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ─────────────────────────────────────────
// POST /api/register
// Crea el usuario en Supabase Auth + perfil
// ─────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (error) throw error

    // Crear fila en profiles (vacía al principio)
    await supabase.from('profiles').insert({ id: data.user.id, email })

    res.json({ userId: data.user.id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/onboarding
// Guarda los datos del onboarding
// ─────────────────────────────────────────
app.post('/api/onboarding', async (req, res) => {
  const { userId, name, age, sex, identity, goal, symptoms, agentName } = req.body
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name,
        age,
        sex,
        identity,
        goal,
        symptoms,           // JSON: { fatiga: 'siempre', sueno: 'aveces', ... }
        agent_name: agentName
      })
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// GET /api/user/:id
// Devuelve perfil + último test diario
// ─────────────────────────────────────────
app.get('/api/user/:id', async (req, res) => {
  try {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (profileErr) throw profileErr

    const { data: lastTest } = await supabase
      .from('daily_tests')
      .select('*')
      .eq('user_id', req.params.id)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    res.json({ profile, lastTest: lastTest || null })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/daily-test
// Guarda el test diario
// ─────────────────────────────────────────
app.post('/api/daily-test', async (req, res) => {
  const {
    userId,
    sleepQuality, sleepHours,
    stressLevel, stressPeak,
    nutritionQuality, mealsCount,
    sportIntensity, sportDuration
  } = req.body
  try {
    const { error } = await supabase.from('daily_tests').insert({
      user_id:           userId,
      sleep_quality:     sleepQuality,
      sleep_hours:       sleepHours,
      stress_level:      stressLevel,
      stress_peak:       stressPeak,
      nutrition_quality: nutritionQuality,
      meals_count:       mealsCount,
      sport_intensity:   sportIntensity,
      sport_duration:    sportDuration
    })
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// POST /api/chat
// Envía mensaje a Claude con contexto del usuario
// ─────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { userId, message, history = [] } = req.body

  // 1. Traer perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  // 2. Traer último test diario
  const { data: lastTest } = await supabase
    .from('daily_tests')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  // 3. Construir system prompt personalizado
  const systemPrompt = buildSystemPrompt(profile, lastTest)

  // 4. Construir historial de mensajes
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',   // rápido y económico para chat
      max_tokens: 300,
      system:     systemPrompt,
      messages
    })

    const reply = response.content[0].text

    // 5. Guardar en historial de chat
    await supabase.from('chat_messages').insert([
      { user_id: userId, role: 'user',      content: message },
      { user_id: userId, role: 'assistant', content: reply   }
    ])

    res.json({ reply })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────
// Helper: System prompt personalizado
// ─────────────────────────────────────────
function buildSystemPrompt(profile, lastTest) {
  const name      = profile?.name       || 'usuario'
  const agentName = profile?.agent_name || 'Jarvis'
  const identity  = profile?.identity   || 'atleta'
  const goal      = profile?.goal       || 'rendir mejor'

  let testContext = ''
  if (lastTest) {
    testContext = `
Último test diario (${lastTest.date}):
- Sueño: ${lastTest.sleep_quality}/5 calidad, ${lastTest.sleep_hours}h
- Estrés: ${lastTest.stress_level}/5 (peor en ${lastTest.stress_peak || 'el día'})
- Nutrición: ${lastTest.nutrition_quality}/5, ${lastTest.meals_count} comidas
- Deporte: ${lastTest.sport_intensity}/5 intensidad, ${lastTest.sport_duration} min
`
  }

  return `Eres ${agentName}, un agente de IA de alto rendimiento y salud para ${name}.

Perfil del usuario:
- Se identifica como: ${identity}
- Objetivo principal: ${goal}
- Síntomas: ${JSON.stringify(profile?.symptoms || {})}
${testContext}

Reglas de comunicación:
- Responde SIEMPRE en español
- Sé conciso: 2-4 oraciones máximo
- Sé directo y accionable (no filosófico)
- Usa datos del test diario cuando estén disponibles
- Adapta el tono al perfil (${identity} → ${identity === 'founder' ? 'productividad y foco' : identity === 'atleta' ? 'rendimiento físico' : 'equilibrio total'})
- No repitas lo que el usuario dijo, ve directo al consejo`
}

// ─────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Human API corriendo en :${PORT}`))
