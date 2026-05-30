-- ════════════════════════════════════════════════════════════════
--  Human App — RLS Policies + Trigger handle_new_user
--  Ejecutar en: Supabase → SQL Editor → Run
--  Idempotente: se puede ejecutar varias veces sin romper.
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 0. Asegurar que profiles.id referencia auth.users.id
--    (si ya existe la FK, no hace nada)
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 1. Habilitar RLS en las 3 tablas
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Forzar RLS también para owners (excepto service_role bypass)
ALTER TABLE public.profiles      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tests   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages FORCE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────
-- 2. Drop policies antiguas (idempotencia)
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own"  ON public.profiles;

DROP POLICY IF EXISTS "daily_tests_select_own" ON public.daily_tests;
DROP POLICY IF EXISTS "daily_tests_insert_own" ON public.daily_tests;
DROP POLICY IF EXISTS "daily_tests_update_own" ON public.daily_tests;
DROP POLICY IF EXISTS "daily_tests_delete_own" ON public.daily_tests;

DROP POLICY IF EXISTS "chat_messages_select_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_own" ON public.chat_messages;

-- ─────────────────────────────────────────────────────────────────
-- 3. PROFILES — un usuario solo ve/edita su propio perfil
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────
-- 4. DAILY_TESTS — un usuario solo ve/edita sus propios tests
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY "daily_tests_select_own"
  ON public.daily_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "daily_tests_insert_own"
  ON public.daily_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_tests_update_own"
  ON public.daily_tests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_tests_delete_own"
  ON public.daily_tests FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- 5. CHAT_MESSAGES — un usuario solo ve/escribe su propio chat
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY "chat_messages_select_own"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "chat_messages_insert_own"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_delete_own"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- 6. Trigger handle_new_user — auto-crea perfil al signUp
--    Idempotente: drop + create
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────
-- 7. Verificación rápida
-- ─────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','daily_tests','chat_messages')
ORDER BY tablename, policyname;
