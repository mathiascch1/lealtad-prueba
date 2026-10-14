// /api/update-pass.js — Vercel Serverless Function
// Actualiza los sellos de un pase existente en Apple/Google Wallet

export default async function handler(req, res) {
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
      ? '¡PREMIO LISTO! Pídelo al cajero 🎁'
      : `Te faltan ${remaining} sellos`;

    const updateData = {
      headerFields: [{ key: 'stamps', label: 'SELLOS', value: `${stamps || 0} / ${maxStamps || 6}` }],
      auxiliaryFields: [{ key: 'progress', label: 'PROGRESO', value: progressMsg }],
      changeMessage: hasReward
        ? '🎁 ¡Completaste tu tarjeta! Pasa a recoger tu premio.'
        : `☕ +1 sello. Llevas ${stamps}/${maxStamps}. ${progressMsg}`
    };

    const response = await fetch(`https://api.walletwallet.dev/api/passes/${serial}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'Error al actualizar el pase', details: errText });
    }

    const result = await response.json();
    return res.status(200).json({ success: true, result });

  } catch (err) {
    console.error('update-pass error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
