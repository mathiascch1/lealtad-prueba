// /api/update-pass.js — Vercel Serverless Function
const https = require('https');

function apiRequest(method, path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.walletwallet.dev',
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Método no permitido' });

  const API_KEY = process.env.WALLETWALLET_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key no configurada' });

  try {
    const { serial, stamps, maxStamps, prize, hasReward } = req.body;
    if (!serial) return res.status(400).json({ error: 'Falta el serial del pase' });

    const remaining = (maxStamps || 6) - (stamps || 0);
    const progressMsg = hasReward
      ? 'PREMIO LISTO! Pidelo al cajero'
      : 'Te faltan ' + remaining + ' sellos';

    const updateData = {
      headerFields: [{ key: 'stamps', label: 'SELLOS', value: (stamps || 0) + ' / ' + (maxStamps || 6) }],
      auxiliaryFields: [{ key: 'progress', label: 'PROGRESO', value: progressMsg }],
      changeMessage: hasReward
        ? 'Completaste tu tarjeta! Pasa a recoger tu premio.'
        : '+1 sello. Llevas ' + stamps + '/' + maxStamps + '. ' + progressMsg
    };

    const result = await apiRequest('PUT', '/api/passes/' + serial, updateData, API_KEY);

    if (result.status >= 400) {
      return res.status(result.status).json({ error: 'Error al actualizar', details: result.data });
    }

    return res.status(200).json({ success: true, result: result.data });

  } catch (err) {
    console.error('update-pass error:', err);
    return res.status(500).json({ error: 'Error interno', msg: err.message });
  }
};
