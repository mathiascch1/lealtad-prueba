// /api/create-pass.js — Vercel Serverless Function
// Crea un pase de Apple/Google Wallet via WalletWallet API

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const API_KEY = process.env.WALLETWALLET_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key no configurada' });

  try {
    const { clientName, clientPhone, stamps, maxStamps, prize, businessName, businessAddr, businessLat, businessLng } = req.body;

    if (!clientName || !clientPhone) {
      return res.status(400).json({ error: 'Faltan datos del cliente' });
    }

    const passData = {
      passType: 'storeCard',
      organizationName: businessName || 'Cafetería Mi tostadita',
      description: `Tarjeta de lealtad - ${businessName || 'Cafetería Mi tostadita'}`,
      backgroundColor: 'rgb(232, 148, 58)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(255, 243, 196)',
      headerFields: [
        { key: 'stamps', label: 'SELLOS', value: `${stamps || 0} / ${maxStamps || 6}` }
      ],
      primaryFields: [
        { key: 'name', label: 'CLIENTE', value: clientName }
      ],
      secondaryFields: [
        { key: 'prize', label: 'PREMIO', value: prize || 'Capuccino gratis' },
        { key: 'phone', label: 'CELULAR', value: clientPhone }
      ],
      auxiliaryFields: [
        { key: 'progress', label: 'PROGRESO', value: stamps >= maxStamps ? '¡PREMIO LISTO!' : `Te faltan ${(maxStamps || 6) - (stamps || 0)} sellos` }
      ],
      backFields: [
        { key: 'rules', label: 'Cómo funciona', value: `Haz tu compra y dile tu nombre o número al cajero. Él te suma el sello. Al juntar ${maxStamps || 6} sellos, tu premio es gratis.` },
        { key: 'addr', label: 'Dirección', value: businessAddr || '' },
        { key: 'contact', label: 'Contacto', value: clientPhone }
      ],
      barcode: { message: clientPhone, format: 'PKBarcodeFormatQR',
