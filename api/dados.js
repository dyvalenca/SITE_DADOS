const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PAGE_SIZE = 1000;

function supabasePage(table, filters, offset) {
  return new Promise((resolve, reject) => {
    let query = `?select=*&limit=${PAGE_SIZE}&offset=${offset}`;
    Object.entries(filters).forEach(([k, v]) => {
      query += `&${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`;
    });

    const urlObj = new URL(`${SUPABASE_URL}/rest/v1/${table}${query}`);

    https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json',
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Supabase resposta inválida: ' + body.slice(0, 200))); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function supabaseFetchAll(table, filters) {
  const allRows = [];
  let offset = 0;
  while (true) {
    const rows = await supabasePage(table, filters, offset);
    if (!Array.isArray(rows)) {
      throw new Error('Resposta inesperada do Supabase: ' + JSON.stringify(rows).slice(0, 200));
    }
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

// Mapeia colunas do Supabase (lowercase_underscore) → nomes de campo esperados pelo frontend
// O ?? faz fallback para o nome original caso o Supabase use nomes diferentes
function mapJogoRow(r) {
  return {
    "DATA":                r.data                ?? r["DATA"]                ?? '',
    "MANDO":               r.mando               ?? r["MANDO"]               ?? '',
    "GOL CORINTHIANS":     r.gol_corinthians     ?? r["GOL CORINTHIANS"]     ?? '',
    "GOL ADVERSARIO":      r.gol_adversario      ?? r["GOL ADVERSARIO"]      ?? '',
    "RESULTADO":           r.resultado           ?? r["RESULTADO"]           ?? '',
    "TIME ADVERSARIO":     r.time_adversario     ?? r["TIME ADVERSARIO"]     ?? '',
    "COMPETIÇÃO":          r.competicao          ?? r["COMPETIÇÃO"]          ?? '',
    "ESTADIO":             r.estadio             ?? r["ESTADIO"]             ?? '',
    "TECNICO CORINTHIANS": r.tecnico_corinthians ?? r["TECNICO CORINTHIANS"] ?? '',
    "LINK":                r.link                ?? r["LINK"]                ?? '',
    "ANO COMPETICAO":      r.ano_competicao      ?? r["ANO COMPETICAO"]      ?? '',
  };
}

function mapGolRow(r) {
  return {
    "DATA":                r.data                  ?? r["DATA"]                   ?? '',
    "JOGADOR GOL":         r.jogador_gol           ?? r["JOGADOR GOL"]            ?? '',
    "CAMISA GOL":          r.camisa_gol            ?? r["CAMISA GOL"]             ?? '',
    "POSIÇÃO":             r.posicao               ?? r["POSIÇÃO"]                ?? '',
    "PAIS":                r.pais                  ?? r["PAIS"]                   ?? '',
    "PENALTI":             r.penalti               ?? r["PENALTI"]                ?? '',
    "BANCO":               r.banco                 ?? r["BANCO"]                  ?? '',
    "JOGADOR ASSISTÊNCIA": r.jogador_assistencia   ?? r["JOGADOR ASSISTÊNCIA"]    ?? '',
    "POSICAO ASSISTENCIA": r.posicao_assistencia   ?? r["POSICAO ASSISTENCIA"]    ?? '',
    "PAIS ASSISTENCIA":    r.pais_assistencia      ?? r["PAIS ASSISTENCIA"]       ?? '',
  };
}

module.exports = async function handler(req, res) {
  const { aba, ano } = req.query;

  if (aba !== 'jogo' && aba !== 'gol') {
    return res.status(400).json({ erro: 'Parâmetro aba inválido. Use jogo ou gol.' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ erro: 'Variáveis de ambiente Supabase não configuradas.' });
  }

  try {
    const filters = {};
    if (aba === 'jogo' && ano) filters['ano_competicao'] = ano;

    const rows = await supabaseFetchAll(aba, filters);
    const data = aba === 'jogo' ? rows.map(mapJogoRow) : rows.map(mapGolRow);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.json({ data, total: data.length });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
