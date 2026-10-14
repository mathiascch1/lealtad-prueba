// /api/create-pass.js — Vercel Serverless Function
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const API_KEY = process.env.WALLETWALLET_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key no configurada' });

  try {
    const { clientName, clientPhone, stamps, maxStamps, prize, businessName, businessAddr, businessLat, businessLng, walletColor, walletLogo, walletStrip, walletIcon, siteUrl } = req.body;

    if (!clientName || !clientPhone) {
      return res.status(400).json({ error: 'Faltan datos del cliente' });
    }

    const passData = {
      passType: 'storeCard',
      organizationName: businessName || 'Cafetería Mi tostadita',
      logoText: businessName || 'Cafetería Mi tostadita',
      description: 'Tarjeta de lealtad - ' + (businessName || 'Cafetería Mi tostadita'),
      color: walletColor || '#E8943A',
      headerFields: [
        { key: 'stamps', label: 'SELLOS', value: (stamps || 0) + ' / ' + (maxStamps || 6) }
      ],
      primaryFields: [
        { key: 'name', label: 'CLIENTE', value: clientName }
      ],
      secondaryFields: [
        { key: 'prize', label: 'PREMIO', value: prize || 'Capuccino gratis' },
        { key: 'phone', label: 'CELULAR', value: clientPhone }
      ],
      auxiliaryFields: [
        { key: 'progress', label: 'PROGRESO', value: stamps >= maxStamps ? '¡PREMIO LISTO!' : 'Te faltan ' + ((maxStamps || 6) - (stamps || 0)) + ' sellos' }
      ],
      backFields: [
        { key: 'rules', label: 'Cómo funciona', value: 'Haz tu compra y dile tu nombre o número al cajero. Él te suma el sello. Al juntar ' + (maxStamps || 6) + ' sellos, tu premio es gratis.' },
        { key: 'addr', label: 'Dirección', value: businessAddr || '' },
        { key: 'contact', label: 'Contacto', value: clientPhone }
      ],
      barcode: { message: (siteUrl || 'https://lealtad-prueba.vercel.app') + '?c=' + clientPhone, format: 'PKBarcodeFormatQR', messageEncoding: 'iso-8859-1', altText: clientPhone },
      barcodes: [{ message: (siteUrl || 'https://lealtad-prueba.vercel.app') + '?c=' + clientPhone, format: 'PKBarcodeFormatQR', messageEncoding: 'iso-8859-1', altText: clientPhone }],
      locations: (businessLat && businessLng) ? [
        { latitude: parseFloat(businessLat), longitude: parseFloat(businessLng), relevantText: '¡Estás cerca de ' + (businessName || 'Cafetería Mi tostadita') + '! Pasa a sumar un sello' }
      ] : [],
      changeMessage: 'Tu tarjeta de lealtad se ha actualizado.'
    };
    // Solo enviar URLs de imagenes si son URLs validas (https y terminan en imagen)
    function isImageUrl(u) { return u && u.startsWith('https://') && /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(u); }
    if (isImageUrl(walletLogo)) passData.logoURL = walletLogo;
    if (isImageUrl(walletStrip)) passData.stripURL = walletStrip;
    if (isImageUrl(walletIcon)) passData.iconURL = walletIcon;

    const result = await apiRequest('POST', '/api/passes', passData, API_KEY);

    if (result.status >= 400) {
      console.error('WalletWallet error:', result.status, result.data);
      return res.status(result.status).json({ error: 'Error al crear el pase', details: result.data });
    }

    return res.status(200).json({
      serial: result.data.serial || result.data.id,
      shareUrl: result.data.shareUrl || result.data.url,
      success: true
    });

  } catch (err) {
    console.error('create-pass error:', err);
    return res.status(500).json({ error: 'Error interno del servidor', msg: err.message });
  }
};
