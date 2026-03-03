const https = require('https');

// Credenciais com fallback hardcoded (chave pública, seguro expor)
const SUPABASE_URL = process.env.SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://xtdavfobpodxeawaygtn.supabase.co';

const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'sb_publishable_B9X6t6kanjvTmGa8zEAF6w_MqxxcZh4';

// Nomes reais das tabelas no Supabase (case-sensitive, conforme criadas)
const TABLE_MAP = { jogo: 'JOGO', gol: 'GOL' };

// Busca uma página de resultados
function supabasePage(table, offset) {
  return new Promise((resolve, reject) => {
    const query = `?select=*&limit=1000&offset=${offset}`;
    const urlObj = new URL(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}${query}`);

    https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'numerosfieis/1.0',
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch (e) { reject(new Error(`JSON inválido [${res.statusCode}]: ${body.slice(0, 300)}`)); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Busca todos os registros paginando de 1000 em 1000
async function fetchAll(table) {
  const allRows = [];
  let offset = 0;

  while (true) {
    const { status, json } = await supabasePage(table, offset);

    if (!Array.isArray(json)) {
      // PostgREST retornou um objeto de erro
      const msg = json?.message || json?.error || JSON.stringify(json).slice(0, 300);
      throw new Error(`Supabase [${status}] "${table}": ${msg}`);
    }

    allRows.push(...json);
    if (json.length < 1000) break;
    offset += 1000;
  }

  return allRows;
}

module.exports = async function handler(req, res) {
  const { aba } = req.query;

  if (aba !== 'jogo' && aba !== 'gol') {
    return res.status(400).json({ erro: 'Parâmetro aba inválido. Use jogo ou gol.' });
  }

  try {
    const table = TABLE_MAP[aba];
    const rows = await fetchAll(table);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    // Retorna os dados brutos — o frontend detecta os nomes de coluna automaticamente
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
