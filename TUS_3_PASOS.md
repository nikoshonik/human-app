# Human App — Solo te quedan 3 pasos

Todo el código está listo, probado y con git inicializado.
Solo necesitás hacer esto vos porque requiere tus cuentas personales.

---

## PASO 1 — Supabase (10 min)
> Crea la base de datos

1. Entrar a https://supabase.com → "Start for free"
2. "New project" → nombre: `human-app` → elegir región Europa
3. Ir a **SQL Editor** (menú izquierdo)
4. Copiar TODO el contenido de `supabase_schema.sql` y pegarlo → clic **Run**
5. Ir a **Settings → API** y copiar estos dos valores:
   - `Project URL` → lo vas a necesitar en el paso 3
   - `service_role` key (la segunda, no la anon) → también para el paso 3

---

## PASO 2 — Claude API key (3 min)
> Para que Jarvis responda de verdad

1. Entrar a https://console.anthropic.com → crear cuenta
2. Ir a **API Keys** → "Create Key" → copiar la key (empieza con `sk-ant-`)

---

## PASO 3 — Deploy en Railway (10 min)
> Pone el backend online

1. Entrar a https://railway.app → "Start a new project"
2. "Deploy from GitHub repo" → conectar tu GitHub → subir la carpeta `human-app/`
   - Si no tenés GitHub: github.com → "New repository" → subir la carpeta
   - En Cursor: abrís la terminal (`Ctrl+\``) y escribís:
     ```
     cd human-app
     git remote add origin https://github.com/TU_USUARIO/human-app.git
     git push -u origin main
     ```
3. En Railway → tu proyecto → **Variables** → agregar:
   ```
   ANTHROPIC_API_KEY   =  sk-ant-XXXXX        (del paso 2)
   SUPABASE_URL        =  https://XXX.supabase.co  (del paso 1)
   SUPABASE_SERVICE_KEY=  eyJ...               (del paso 1)
   ```
4. Railway te da una URL tipo `https://human-app-backend.up.railway.app`

---

## ÚLTIMO PASO — Conectar el frontend (1 min)

Abrís `HumanApp.html` en Cursor, buscás esta línea (~750):

```js
const API_URL = 'https://TU-BACKEND.railway.app'
```

Y la reemplazás con tu URL de Railway:

```js
const API_URL = 'https://human-app-backend.up.railway.app'
```

---

## Con eso ya tenés:
- ✅ Chat con Jarvis respondiendo con Claude real
- ✅ Onboarding guardado en base de datos
- ✅ Test diario guardado por usuario
- ✅ Jarvis personalizado con tu perfil y último test

## Próximo: App Store
Cuando quieras publicar en iOS, decime y arrancamos con Capacitor.
