const https = require('https');

function buscar(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        buscar(res.headers.location).then(resolve).catch(reject);
        res.resume();
        return;
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Resposta inválida: ' + body.slice(0, 100))); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  const { page = 1, limit = 500 } = req.query;
  const url = `https://script.google.com/macros/s/AKfycbzrkyGBdn7WGN7yH-Y1IswgW6B5heRD8khBkCNjEGTHiDUR6lDcTCGr3fDaNurXyMkB/exec?page=${page}&limit=${limit}`;

  try {
    const data = await buscar(url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
