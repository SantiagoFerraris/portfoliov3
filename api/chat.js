// Vercel Serverless — AI Chat Proxy (Gemini 2.5 Flash + Groq fallback)
// Configurar en Vercel → Settings → Environment Variables:
//   GEMINI_API_KEY  (recomendado) — https://aistudio.google.com/
//   GROQ_API_KEY    (fallback)    — https://console.groq.com/

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of rateLimitMap)
    if (now - e.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(ip);
}, RATE_LIMIT_WINDOW);

export default async function handler(req, res) {
  // CORS — acepta cualquier origen (app personal)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Demasiadas solicitudes. Máx 20 por minuto.' });

  const body = req.body;
  if (!body?.contents?.length) return res.status(400).json({ error: 'Missing contents' });

  // Validar longitud
  const lastMsg = body.contents[body.contents.length - 1];
  const msgText = lastMsg?.parts?.map(p => p.text || '').join('') || '';
  if (msgText.length > 2000) return res.status(400).json({ error: 'Mensaje demasiado largo (máx 2000 caracteres)' });

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!geminiKey && !groqKey) return res.status(500).json({ error: 'No hay API keys configuradas. Agregá GEMINI_API_KEY o GROQ_API_KEY en Vercel → Settings → Environment Variables.' });

  // Desactivar thinking de Gemini 2.5 Flash para respuestas rápidas
  if (!body.generationConfig) body.generationConfig = {};
  if (!body.generationConfig.thinkingConfig) body.generationConfig.thinkingConfig = { thinkingBudget: 0 };

  // Intentar Gemini primero
  if (geminiKey) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 9000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(timeout);
      if (r.ok) {
        const data = await r.json();
        data._provider = 'gemini';
        return res.status(200).json(data);
      }
      if (r.status !== 429 && r.status < 500) {
        const err = await r.text();
        return res.status(r.status).json({ error: err });
      }
    } catch (e) { /* timeout → fallback a Groq */ }
  }

  // Fallback: Groq llama-3.3-70b
  if (groqKey) {
    try {
      function toGroq(body) {
        const msgs = [];
        if (body.systemInstruction?.parts) msgs.push({ role: 'system', content: body.systemInstruction.parts.map(p => p.text).join('\n') });
        if (body.contents) body.contents.forEach(c => {
          msgs.push({ role: c.role === 'model' ? 'assistant' : 'user', content: c.parts?.map(p => p.text).join('\n') || '' });
        });
        return msgs;
      }
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: toGroq(body), temperature: 0.7, max_tokens: 1024 })
      });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content || '';
      return res.status(200).json({ _provider: 'groq', candidates: [{ content: { parts: [{ text }] } }] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(503).json({ error: 'Todos los proveedores de IA no están disponibles' });
}
