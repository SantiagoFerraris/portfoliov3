# Mis Inversiones 📊

**Portfolio de inversiones argentinas con mercado en tiempo real + Asistente IA**

## Deploy en Vercel (5 minutos)

### 1. Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/mis-inversiones.git
git push -u origin main
```

### 2. Deploy en Vercel
1. Ir a [vercel.com](https://vercel.com) → **Add New Project**
2. Conectar tu repositorio de GitHub
3. Click en **Deploy** (sin cambiar nada)

### 3. Configurar API Keys para el Chat IA

En Vercel → Tu proyecto → **Settings** → **Environment Variables**:

| Variable | Valor | Dónde obtenerla |
|----------|-------|-----------------|
| `GEMINI_API_KEY` | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) (gratis) |
| `GROQ_API_KEY` | `gsk_...` | [console.groq.com](https://console.groq.com/) (gratis, fallback) |

> **Con una sola alcanza.** Gemini es la principal, Groq es el backup automático.

Después de agregar las variables, hacer **Redeploy** desde Vercel.

---

## APIs de mercado (gratuitas, sin key)

| Fuente | Datos |
|--------|-------|
| `dolarapi.com` | Dólar Oficial, MEP, Blue, CCL, Tarjeta |
| `argentinadatos.com` | Inflación mensual, Riesgo País |
| `data912.com` (via proxy `/api/data912`) | CEDEARs precios y variaciones |

---

## Estructura del proyecto

```
mis-inversiones/
├── index.html          ← App completa (CSS + JS inline, sin dependencias externas)
├── api/
│   ├── chat.js         ← Proxy IA (Gemini + Groq)
│   └── data912.js      ← Proxy CEDEARs/Bonos
├── sw.js               ← Service Worker (offline)
├── manifest.json       ← PWA manifest
├── offline.html        ← Pantalla sin conexión
└── vercel.json         ← Rewrites SPA + headers
```

---

## Características

- 📊 **Portafolio** — CRUD de inversiones (CEDEARs, Bonos, FCI, PF, USD, Crypto, etc.)
- 💹 **Mercado** — Cotizaciones dólar en tiempo real + CEDEARs top movers
- 🤖 **Asistente IA** — Chat con contexto de tu portafolio (Gemini 2.5 Flash)
- 👤 **Perfiles** — Hasta 3 perfiles con PIN opcional
- 📈 **Evolución** — Gráfico histórico de 30 días
- 🌙 **Tema** — Dark/Light mode
- 📱 **PWA** — Instalable en celular, funciona offline
