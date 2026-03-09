const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || process.env.SUPABASE_URL
  || 'https://xtdavfobpodxeawaygtn.supabase.co';

const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY
  || 'sb_publishable_B9X6t6kanjvTmGa8zEAF6w_MqxxcZh4';

const TABLE_MAP = { jogo: 'JOGO', gol: 'GOL' };

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

module.exports = async function handler(req, res) {
  const { aba } = req.query;

  if (aba !== 'jogo' && aba !== 'gol') {
    return res.status(400).json({ erro: 'Parâmetro aba inválido. Use jogo ou gol.' });
  }

  try {
    const table = TABLE_MAP[aba];
    const rows = await fetchAll(table);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
