# Guía de despliegue: Gemini + Groq + Supabase (o Neon) + GitHub OAuth + Vercel

Orden recomendado: 1) claves de IA, 2) base de datos, 3) probar en local, 4) GitHub (repo y OAuth), 5) Vercel.

## 1. API key gratuita de Gemini

1. Entra a https://aistudio.google.com/apikey con tu cuenta de Google.
2. Pulsa **Create API key** (elige o crea un proyecto) y copia la clave.
3. Pégala en `GEMINI_API_KEY`.
4. El modelo se define en `GEMINI_MODEL`. Los nombres y las cuotas gratuitas cambian: en https://ai.google.dev/gemini-api/docs/models y en AI Studio (Rate limits) ves qué modelos tienes disponibles. Si la app responde que no encuentra el modelo o que superaste la cuota, cambia `GEMINI_MODEL` por otro modelo Flash o Flash-Lite disponible para ti.

### Groq como respaldo (opcional, recomendado)

1. Entra a https://console.groq.com/keys, crea una cuenta gratuita y pulsa **Create API Key**.
2. Pégala en `GROQ_API_KEY`. El modelo se define en `GROQ_MODEL` (por defecto `openai/gpt-oss-20b`); revisa los disponibles en https://console.groq.com/docs/models.
3. Con las dos claves, si Gemini falla por cuota, caída, timeout o modelo inexistente, la misma petición se repite con Groq automáticamente. Para usar Groq como principal pon `LLM_PROVIDER="groq"`; para desactivar el respaldo, `LLM_FALLBACK="none"`.

## 2. Base de datos

### Opción A: Supabase

1. https://supabase.com → **New project**. Elige una región cercana y guarda la contraseña de la base de datos (si tiene caracteres especiales, codifícalos para la URL: `@` → `%40`, `#` → `%23`, `/` → `%2F`).
2. Pulsa **Connect** y copia dos cadenas:
   - **Transaction pooler** (puerto 6543) → `DATABASE_URL`, añadiendo al final `?sslmode=no-verify`.
   - **Session pooler** (puerto 5432) → `DIRECT_URL`, añadiendo al final `?sslmode=require`.
3. Usa el session pooler (no la conexión directa) para `DIRECT_URL`: la conexión directa de Supabase es solo IPv6 y falla en muchas redes.

Nota sobre `sslmode=no-verify`: el driver `pg` valida el certificado y el del pooler de Supabase no está en el almacén público, por eso se desactiva la verificación en la conexión de la app. El tráfico sigue cifrado. Si prefieres verificar, descarga el certificado de Supabase (Database settings → SSL) y configúralo en el cliente.

### Opción B: Neon

1. https://neon.tech → crea un proyecto.
2. En **Connection details** activa **Pooled connection**: esa URL (host con `-pooler`) va en `DATABASE_URL`; la URL sin pooler va en `DIRECT_URL`. Ambas con `?sslmode=require`.

### Crear las tablas

```powershell
npx prisma db push
```

Comprueba en el panel de la BD (Table Editor / Tables) que existen las 12 tablas.

Si ya habías creado las tablas con una versión anterior del proyecto, ejecuta `npx prisma db push` otra vez: las fases 2 y 3 añadieron columnas (`analisis.auditadoEn`, `analisis.origenCacheId`, `uso_diario.consultasIA`). Solo agrega columnas; no borra datos.

## 3. Probar en local

```powershell
copy .env.example .env.local   # rellena DATABASE_URL, DIRECT_URL, AUTH_SECRET, GEMINI_API_KEY
npm install
npm run dev
```

1. Crea una cuenta en `/register`, entra a `/analyze`, pega un fragmento y pulsa **Analizar código**.
2. Esta es la primera prueba contra Gemini real: si falla, el mensaje te dirá si es clave, cuota o modelo.

## 4. GitHub: repositorio y OAuth

### Repositorio

```powershell
git init
git add .
git commit -m "VibeDecoder fase 1"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/vibedecoder.git
git push -u origin main
```

Crea antes el repositorio vacío en https://github.com/new. `.env.local` está en `.gitignore`: nunca subas claves.

### OAuth App (login con GitHub)

GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**. Una OAuth App solo admite una URL de callback, así que crea dos: una para local y otra para producción.

| | Local | Producción |
|---|---|---|
| Homepage URL | `http://localhost:3000` | `https://TU-APP.vercel.app` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` | `https://TU-APP.vercel.app/api/auth/callback/github` |

Genera un **Client secret** en cada una. Local: `AUTH_GITHUB_ID` y `AUTH_GITHUB_SECRET` en `.env.local`. Producción: en Vercel.

## 5. Vercel

1. https://vercel.com → entra con GitHub → **Add New… → Project** → importa el repositorio.
2. Framework: Next.js (se detecta solo). No cambies los comandos.
3. En **Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL del pooler (con `?sslmode=no-verify` en Supabase) |
| `DIRECT_URL` | URL de session pooler / directa |
| `AUTH_SECRET` | resultado de `npx auth secret` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | de la OAuth App **de producción** |
| `GEMINI_API_KEY` | tu clave |
| `GEMINI_MODEL` | el modelo que te funcionó en local |
| `GROQ_API_KEY` | tu clave de Groq (opcional, respaldo) |
| `GROQ_MODEL` | `openai/gpt-oss-20b` u otro disponible |
| `LLM_PROVIDER` | `gemini` |
| `DAILY_ANALYSIS_LIMIT` / `DAILY_AI_QUERIES_LIMIT` | opcionales: `10` y `60` por defecto |

4. Pulsa **Deploy**. Cuando termine tendrás la URL `https://TU-APP.vercel.app`.
5. Crea la OAuth App de producción con esa URL (paso 4) y actualiza `AUTH_GITHUB_ID` y `AUTH_GITHUB_SECRET` en Vercel (Settings → Environment Variables), luego **Redeploy**.
6. Región: en Settings → Functions elige una región cercana a tu base de datos para reducir latencia.

### Verificación en producción

- La landing y la demo cargan sin iniciar sesión.
- Registro y login por correo funcionan.
- Un análisis nuevo termina y aparece en el historial.
- Login con GitHub funciona.
- El quiz se califica, la pregunta aparece en **Progreso** y el chat responde.
- **Markdown** descarga un `.md`, **PDF** abre la vista para imprimir y **Compartir** crea un enlace que abre en una ventana privada sin iniciar sesión.

### Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `self-signed certificate in certificate chain` | Falta `?sslmode=no-verify` en `DATABASE_URL` (Supabase). |
| `prisma db push` se cuelga o da timeout | Estás usando la conexión directa (IPv6). Usa el session pooler. |
| Errores de *prepared statement* | Usa el session pooler (5432) también en `DATABASE_URL`. |
| Login con GitHub: `redirect_uri_mismatch` | La callback de la OAuth App no coincide exactamente con la URL del sitio. |
| `Configuration` / `MissingSecret` | Falta `AUTH_SECRET` en Vercel. |
| El análisis dice «límite gratuito» | Se agotó la cuota por minuto o día de Gemini: espera, cambia `GEMINI_MODEL` o configura `GROQ_API_KEY` como respaldo. |
| «Llegaste al límite de N análisis por día» | Es el límite propio de la app: sube `DAILY_ANALYSIS_LIMIT` o espera al día siguiente (zona `APP_TIMEZONE`). |
| Error `column ... does not exist` | La BD es de una versión anterior: ejecuta `npx prisma db push`. |
| El enlace público muestra «no encontrado» | El análisis se borró o se dejó de compartir; crea un enlace nuevo. |
| El análisis tarda más de 60 s | Reduce el código o baja `LLM_CHUNK_LINES`; las rutas tienen `maxDuration = 60`. |
