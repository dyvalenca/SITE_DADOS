const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || process.env.SUPABASE_URL
  || 'https://xtdavfobpodxeawaygtn.supabase.co';

const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY
  || 'sb_publishable_B9X6t6kanjvTmGa8zEAF6w_MqxxcZh4';

const TABLE_MAP = { jogo: 'JOGO', gol: 'GOL' };

// Estádios permitidos para o widget (validação de segurança)
const ESTADIOS_PERMITIDOS = [
  'NEO QUIMICA ARENA',
  'ARENA CORINTHIANS',
];

function normalizar(str) {
  return (str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

async function fetchAll(table) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const allRows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(offset, offset + 999);

    if (error) throw new Error(`Supabase "${table}": ${error.message}`);
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  return allRows;
}

async function fetchArtilheirosEstadio(estadio) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase.rpc('get_artilheiros_estadio', {
    estadio_nome: estadio,
  });
  if (error) throw new Error(`RPC get_artilheiros_estadio: ${error.message}`);
  return data || [];
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const { aba, tipo, estadio } = req.query;

  // ── Rota: widget artilheiros por estádio ──────────────────────────────────
  if (tipo === 'artilheiros-estadio') {
    if (!estadio || typeof estadio !== 'string') {
      return res.status(400).json({ erro: 'Parâmetro estadio obrigatório.' });
    }
    const estadioNorm = normalizar(estadio);
    const valido = ESTADIOS_PERMITIDOS.some(e => normalizar(e) === estadioNorm);
    if (!valido) {
      return res.status(400).json({ erro: 'Estádio não permitido.' });
    }
    try {
      const rows = await fetchArtilheirosEstadio(estadio.trim().toUpperCase());
      return res.json({ data: rows, total: rows.length });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  // ── Rota: tabelas brutas (jogo / gol) ─────────────────────────────────────
  if (aba !== 'jogo' && aba !== 'gol') {
    return res.status(400).json({ erro: 'Parâmetro aba inválido. Use jogo ou gol.' });
  }

  try {
    res.setHeader('Cache-Control', 'no-store');
    const table = TABLE_MAP[aba];
    const rows = await fetchAll(table);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
