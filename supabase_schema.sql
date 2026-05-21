-- ═══════════════════════════════════════════════════
--  Human App — Supabase Schema
--  Corré esto en: supabase.com → SQL Editor → Run
-- ═══════════════════════════════════════════════════

-- ── Tabla: profiles ────────────────────────────────
-- Extiende auth.users con datos del onboarding
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email        TEXT,
  name         TEXT,
  age          INTEGER,
  sex          TEXT CHECK (sex IN ('hombre','mujer','prefiero_no_decir')),
  identity     TEXT CHECK (identity IN ('founder','atleta','ambos')),
  goal         TEXT,
  symptoms     JSONB DEFAULT '{}'::jsonb,
  agent_name   TEXT DEFAULT 'Jarvis',
  level        INTEGER DEFAULT 1,
  streak       INTEGER DEFAULT 0,
  days_active  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: daily_tests ─────────────────────────────
-- Un registro por día por usuario
CREATE TABLE IF NOT EXISTS daily_tests (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date               DATE DEFAULT CURRENT_DATE,

  -- Sueño
  sleep_quality      SMALLINT CHECK (sleep_quality BETWEEN 1 AND 5),
  sleep_hours        DECIMAL(3,1),

  -- Estrés
  stress_level       SMALLINT CHECK (stress_level BETWEEN 1 AND 5),
  stress_peak        TEXT CHECK (stress_peak IN ('mañana','tarde','noche')),

  -- Nutrición
  nutrition_quality  SMALLINT CHECK (nutrition_quality BETWEEN 1 AND 5),
  meals_count        SMALLINT,

  -- Deporte
  sport_intensity    SMALLINT CHECK (sport_intensity BETWEEN 1 AND 5),
  sport_duration     SMALLINT,   -- en minutos

  created_at         TIMESTAMPTZ DEFAULT NOW(),

  -- Solo un test por día por usuario
  UNIQUE(user_id, date)
);

-- ── Tabla: chat_messages ───────────────────────────
-- Historial de conversación con el agente
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security (RLS) ───────────────────────
-- Cada usuario solo ve sus propios datos

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
CREATE POLICY "Usuarios ven su perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuarios editan su perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies: daily_tests
CREATE POLICY "Usuarios ven sus tests"
  ON daily_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios crean sus tests"
  ON daily_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies: chat_messages
CREATE POLICY "Usuarios ven su chat"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- ── Índices ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_tests_user_date
  ON daily_tests(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user
  ON chat_messages(user_id, created_at DESC);

-- ── Trigger: updated_at automático ────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
