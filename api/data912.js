// Vercel Serverless — Proxy para data912.com
// Evita CORS y expone los endpoints de mercado argentino
// Uso: /api/data912?q=live/arg_cedears
//                   ?q=live/arg_bonos
//                   ?q=live/arg_lecaps
//                   ?q=live/arg_ons

const BASE = 'https://data912.com/live/';

const ALLOWED_QUERIES = {
  'live/arg_cedears': 'arg_cedears',
  'live/arg_bonos':   'arg_bonos',
  'live/arg_lecaps':  'arg_lecaps',
  'live/arg_ons':     'arg_ons',
  'live/arg_acciones':'arg_acciones',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query.q || '';
  const endpoint = ALLOWED_QUERIES[q];
  if (!endpoint) return res.status(400).json({ error: 'Endpoint no válido. Usá: live/arg_cedears, live/arg_bonos, live/arg_lecaps, live/arg_ons' });

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(BASE + endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MisInversiones/1.0)',
        'Accept': 'application/json'
      },
      signal: ctrl.signal
    });
    clearTimeout(timeout);
    if (!r.ok) return res.status(r.status).json({ error: 'data912 respondió con status ' + r.status });
    const data = await r.json();
    // Cache por 60s en Vercel Edge
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(503).json({ error: 'No se pudo conectar a data912: ' + e.message });
  }
}
