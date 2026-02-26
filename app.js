// =====================================================================
// CONFIGURAÇÃO — troque pela URL da sua API do Google Apps Script
// =====================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbzrkyGBdn7WGN7yH-Y1IswgW6B5heRD8khBkCNjEGTHiDUR6lDcTCGr3fDaNurXyMkB/exec";

// =====================================================================
// ESTADO GLOBAL
// =====================================================================
let dadosGlobais = [];
let dadosFiltrados = [];
let paginaAtual = 1;
let chartInstance = null;
let chartCompInstance = null;
const itensPorPagina = 50;
let metricaAtual = "aproveitamento";
let sortColTec = 'jogos';
let sortDirTec = -1;
let groupByTabTec = 'tec';

// =====================================================================
// INICIALIZAÇÃO
// =====================================================================
window.onload = function () {
  carregarDados();
  document.getElementById('tabelaCorpo').addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-link]');
    if (btn) { abrirVideo(btn.dataset.link); return; }
    const td = e.target.closest('td[data-filtro]');
    if (!td) return;
    filtrarPorCelula(td.dataset.filtro, td.dataset.valor);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharVideo(); });
};

// =====================================================================
// CARREGAMENTO DE DADOS VIA API REST (substitui google.script.run)
// =====================================================================
async function carregarDados() {
  try {
    // Busca todas as páginas da API
    let pagina = 1;
    let totalPaginas = 1;
    let todos = [];

    while (pagina <= totalPaginas) {
      const resp = await fetch(`${API_URL}?page=${pagina}&limit=500`);
      const json = await resp.json();
      totalPaginas = json.totalPages;

      // Normaliza os dados para o mesmo formato abreviado que o código original usa
      const normalizados = json.data.map(row => ({
        d: formatarData(row["DATA"]),
        a: row["ANO"],
        m: row["MANDO"],
        p: (row["GOL CORINTHIANS"] === "" ? "0" : row["GOL CORINTHIANS"]) + "x" + (row["GOL ADVERSARIO"] === "" ? "0" : row["GOL ADVERSARIO"]),
        r: row["RESULTADO"] ? String(row["RESULTADO"]).trim() : "",
        adv: row["ADVERSARIO"],
        c: row["COMPETIÇÃO"],
        e: row["ESTADIO"],
        t: row["TECNICO CORINTHIANS"],
        lnk: row["LINK"] ? String(row["LINK"]).trim() : ""
      }));

      todos = todos.concat(normalizados);
      pagina++;
    }

    dadosGlobais = todos;
    document.getElementById('msg-status').innerText = `${dadosGlobais.length.toLocaleString('pt-BR')} jogos carregados!`;
    popularAnos();
    popularListasDinamicas(dadosGlobais);
    resetPaginacao();

    const overlay = document.getElementById('loading-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 500);

  } catch (err) {
    console.error("Erro ao carregar dados:", err);
    document.getElementById('msg-status').innerText = "Erro ao carregar dados. Tente recarregar a página.";
    const overlay = document.getElementById('loading-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 500);
  }
}

// Converte data ISO (2026-02-25T00:00:00Z) para DD/MM/AAAA
function formatarData(valor) {
  if (!valor) return '';
  // Se já está no formato DD/MM/AAAA
  if (typeof valor === 'string' && valor.includes('/')) return valor;
  // Se é uma data ISO
  try {
    const d = new Date(valor);
    if (isNaN(d)) return valor;
    const dia = String(d.getUTCDate()).padStart(2, '0');
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const ano = d.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    return valor;
  }
}

// =====================================================================
// VÍDEO
// =====================================================================
function abrirVideo(url) {
  let embedUrl = url;
  const yt = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([^&?\/\s]+)/);
  if (yt) embedUrl = 'https://www.youtube.com/embed/' + yt[1] + '?autoplay=1';
  document.getElementById('video-frame').src = embedUrl;
  document.getElementById('video-modal').style.display = 'flex';
}

function fecharVideo() {
  document.getElementById('video-frame').src = '';
  document.getElementById('video-modal').style.display = 'none';
}

// =====================================================================
// FILTROS
// =====================================================================
function filtrarPorCelula(campo, valor) {
  if (campo === 'mando') {
    const sel = document.getElementById('fMando');
    sel.value = (sel.value === valor) ? '' : valor;
    aoMudarFiltroPrincipal();
    return;
  }
  const idMap = { comp: 'fComp', adv: 'fAdv', est: 'fEst', tec: 'fTec' };
  const labelMap = { comp: 'Todas', adv: 'Todos', est: 'Todos', tec: 'Todos' };
  const id = idMap[campo];
  if (!id) return;
  const checkboxes = Array.from(document.querySelectorAll(`#${id} .items input`));
  const checked = checkboxes.filter(cb => cb.checked);
  if (checked.length === 1 && checked[0].value === valor) {
    checked[0].checked = false;
  } else {
    checkboxes.forEach(cb => cb.checked = false);
    const target = checkboxes.find(cb => cb.value === valor);
    if (target) target.checked = true;
  }
  atualizarAnchorLabel(id, labelMap[campo]);
  resetPaginacao();
}

function popularAnos() {
  const anosUnicos = [...new Set(dadosGlobais.map(j => parseInt(j.a)))].filter(Boolean).sort((a, b) => a - b);
  const sDe = document.getElementById('fAnoDe');
  const sAte = document.getElementById('fAnoAte');
  sDe.innerHTML = "";
  sAte.innerHTML = "";
  anosUnicos.forEach(ano => { sDe.add(new Option(ano, ano)); sAte.add(new Option(ano, ano)); });
  sDe.value = anosUnicos[0];
  sAte.value = anosUnicos[anosUnicos.length - 1];
}

function popularListasDinamicas(baseDeDados) {
  const comps = [...new Set(baseDeDados.map(j => j.c ? j.c.toString().trim() : ""))].filter(Boolean).sort();
  const advs = [...new Set(baseDeDados.map(j => j.adv ? j.adv.toString().trim() : ""))].filter(Boolean).sort();
  const ests = [...new Set(baseDeDados.map(j => j.e ? j.e.toString().trim() : ""))].filter(Boolean).sort();
  const golsProSet = new Set(); const golsConSet = new Set(); const saldoSet = new Set();
  baseDeDados.forEach(j => {
    if (j.p) {
      const g = j.p.toLowerCase().split('x');
      if (g.length === 2) {
        const p = parseInt(g[0]); const c = parseInt(g[1]);
        if (!isNaN(p)) golsProSet.add(p);
        if (!isNaN(c)) golsConSet.add(c);
        if (!isNaN(p) && !isNaN(c)) saldoSet.add(p - c);
      }
    }
  });
  const golsPro = [...golsProSet].sort((a, b) => a - b).map(String);
  const golsCon = [...golsConSet].sort((a, b) => a - b).map(String);
  const saldo = [...saldoSet].sort((a, b) => a - b).map(String);
  const tecs = [...new Set(baseDeDados.map(j => j.t ? j.t.toString().trim() : ""))].filter(Boolean).sort();
  preencherMultiSelect('fComp', comps, 'Todas', getValoresMulti('fComp'));
  preencherMultiSelect('fAdv', advs, 'Todos', getValoresMulti('fAdv'));
  preencherMultiSelect('fEst', ests, 'Todos', getValoresMulti('fEst'));
  preencherMultiSelect('fTec', tecs, 'Todos', getValoresMulti('fTec'));
  preencherMultiSelect('fGolsPro', golsPro, 'Todos', getValoresMulti('fGolsPro'));
  preencherMultiSelect('fGolsCon', golsCon, 'Todos', getValoresMulti('fGolsCon'));
  preencherMultiSelect('fSaldo', saldo, 'Todos', getValoresMulti('fSaldo'));
}

function preencherMultiSelect(id, lista, labelPadrao, selecionadosAnteriormente) {
  const container = document.querySelector(`#${id} .items`);
  container.innerHTML = "";
  lista.forEach(item => {
    const isChecked = selecionadosAnteriormente.includes(item) ? "checked" : "";
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${item}" ${isChecked} onchange="aoMudarFiltroCheck('${id}', '${labelPadrao}')"> ${item}`;
    container.appendChild(label);
  });
  atualizarAnchorLabel(id, labelPadrao);
}

function aoMudarFiltroPrincipal() { filtrarDadosParaListas(); resetPaginacao(); }
function aoMudarFiltroCheck(id, labelPadrao) { atualizarAnchorLabel(id, labelPadrao); resetPaginacao(); }

function filtrarDadosParaListas() {
  const anoDe = parseInt(document.getElementById('fAnoDe').value);
  const anoAte = parseInt(document.getElementById('fAnoAte').value);
  const inputDataDe = document.getElementById('fDataDe').value;
  const inputDataAte = document.getElementById('fDataAte').value;
  const dateDe = inputDataDe ? new Date(inputDataDe + "T00:00:00") : null;
  const dateAte = inputDataAte ? new Date(inputDataAte + "T23:59:59") : null;
  const fM = document.getElementById('fMando').value;
  const fClassicos = document.getElementById('fClassicos').checked;
  const fNQA = document.getElementById('fNQA').checked;
  const listaClassicos = ['PALMEIRAS', 'SANTOS', 'SAO PAULO'];

  const dadosParaListas = dadosGlobais.filter(j => {
    const dataJogo = parseDataBR(j.d);
    const matchAno = (parseInt(j.a) >= anoDe && parseInt(j.a) <= anoAte);
    let matchData = true;
    if (dateDe && dataJogo < dateDe) matchData = false;
    if (dateAte && dataJogo > dateAte) matchData = false;
    const matchMando = (!fM || j.m === fM);
    let matchEspecial = true;
    if (fClassicos) {
      const advNorm = j.adv.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!listaClassicos.includes(advNorm)) matchEspecial = false;
    }
    if (fNQA && matchEspecial) {
      const estNorm = j.e ? j.e.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
      if (!estNorm.includes("NEO QUIMICA ARENA")) matchEspecial = false;
    }
    return matchAno && matchData && matchMando && matchEspecial;
  });
  popularListasDinamicas(dadosParaListas);
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  const isVisible = el.classList.contains('visible');
  fecharDropdowns();
  if (!isVisible) el.classList.add('visible');
}

function fecharDropdowns(e) {
  if (e && e.target.closest('.dropdown-check-list')) return;
  document.querySelectorAll('.dropdown-check-list').forEach(el => el.classList.remove('visible'));
}

function atualizarAnchorLabel(id, labelPadrao) {
  const checkboxes = document.querySelectorAll(`#${id} .items input:checked`);
  const anchor = document.querySelector(`#${id} .anchor`);
  if (checkboxes.length === 0) { anchor.innerText = labelPadrao; }
  else if (checkboxes.length === 1) { anchor.innerText = checkboxes[0].value; }
  else { anchor.innerText = `${checkboxes.length} selecionados`; }
}

function getValoresMulti(id) {
  const el = document.getElementById(id);
  if (!el) return [];
  return Array.from(el.querySelectorAll('.items input:checked')).map(cb => cb.value);
}

function limparFiltros() {
  popularAnos();
  document.getElementById('fDataDe').value = "";
  document.getElementById('fDataAte').value = "";
  document.querySelectorAll('.dropdown-check-list input').forEach(cb => cb.checked = false);
  document.querySelectorAll('.form-check-input').forEach(cb => cb.checked = false);
  popularListasDinamicas(dadosGlobais);
  document.getElementById('fMando').value = "";
  resetPaginacao();
}

function resetPaginacao() { paginaAtual = 1; aplicarFiltros(); }

function parseDataBR(str) {
  if (!str) return null;
  const partes = str.split('/');
  return new Date(partes[2], partes[1] - 1, partes[0]);
}

function aplicarFiltros() {
  const anoDe = parseInt(document.getElementById('fAnoDe').value);
  const anoAte = parseInt(document.getElementById('fAnoAte').value);
  const inputDataDe = document.getElementById('fDataDe').value;
  const inputDataAte = document.getElementById('fDataAte').value;
  const dateDe = inputDataDe ? new Date(inputDataDe + "T00:00:00") : null;
  const dateAte = inputDataAte ? new Date(inputDataAte + "T23:59:59") : null;
  const selComps = getValoresMulti('fComp');
  const selAdvs = getValoresMulti('fAdv');
  const selEsts = getValoresMulti('fEst');
  const selTecs = getValoresMulti('fTec');
  const excComp = document.getElementById('excComp').checked;
  const excAdv = document.getElementById('excAdv').checked;
  const excEst = document.getElementById('excEst').checked;
  const fM = document.getElementById('fMando').value;
  const fClassicos = document.getElementById('fClassicos').checked;
  const fNQA = document.getElementById('fNQA').checked;
  const listaClassicos = ['PALMEIRAS', 'SANTOS', 'SAO PAULO'];
  const selGolsPro = getValoresMulti('fGolsPro').map(Number);
  const selGolsCon = getValoresMulti('fGolsCon').map(Number);
  const selSaldo = getValoresMulti('fSaldo').map(Number);

  dadosFiltrados = dadosGlobais.filter(j => {
    const dataJogo = parseDataBR(j.d);
    const matchAno = (parseInt(j.a) >= anoDe && parseInt(j.a) <= anoAte);
    let matchData = true;
    if (dateDe && dataJogo < dateDe) matchData = false;
    if (dateAte && dataJogo > dateAte) matchData = false;
    let matchComp = true;
    if (selComps.length > 0) { matchComp = excComp ? !selComps.includes(j.c) : selComps.includes(j.c); }
    let matchAdv = true;
    if (selAdvs.length > 0) { matchAdv = excAdv ? !selAdvs.includes(j.adv) : selAdvs.includes(j.adv); }
    let matchEst = true;
    if (selEsts.length > 0) { matchEst = excEst ? !selEsts.includes(j.e) : selEsts.includes(j.e); }
    let matchTec = true;
    if (selTecs.length > 0) { matchTec = selTecs.includes(j.t ? j.t.toString().trim() : ''); }
    const matchMando = (!fM || j.m === fM);
    let matchEspecial = true;
    if (fClassicos) {
      const advNorm = j.adv.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!listaClassicos.includes(advNorm)) matchEspecial = false;
    }
    if (fNQA && matchEspecial) {
      const estNorm = j.e ? j.e.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
      if (!estNorm.includes("NEO QUIMICA ARENA")) matchEspecial = false;
    }
    let pro = 0, con = 0;
    if (j.p) {
      const g = j.p.toLowerCase().split('x');
      if (g.length === 2) { pro = parseInt(g[0]) || 0; con = parseInt(g[1]) || 0; }
    }
    const saldo = pro - con;
    const matchGols = (selGolsPro.length === 0 || selGolsPro.includes(pro))
      && (selGolsCon.length === 0 || selGolsCon.includes(con))
      && (selSaldo.length === 0 || selSaldo.includes(saldo));
    return matchAno && matchData && matchComp && matchAdv && matchMando && matchEspecial && matchEst && matchTec && matchGols;
  });

  atualizarEstatisticas(dadosFiltrados);
  render();
  renderizarGrafico(dadosFiltrados);
  renderizarGraficoComparativo(dadosFiltrados);
  renderizarTabelaTecnicos(dadosFiltrados);
}

// =====================================================================
// TABELA DE AGRUPAMENTOS (técnico / competição / ano / adversário)
// =====================================================================
function ordenarTecnicos(col) {
  if (sortColTec === col) { sortDirTec *= -1; } else { sortColTec = col; sortDirTec = -1; }
  renderizarTabelaTecnicos(dadosFiltrados);
}

function mudarAgrupamento(tipo) {
  groupByTabTec = tipo;
  if (tipo === 'ano') { sortColTec = 'grupo'; sortDirTec = 1; }
  else { sortColTec = 'jogos'; sortDirTec = -1; }
  const titulos = { tec: 'Estatísticas por Técnico', comp: 'Estatísticas por Competição', ano: 'Estatísticas por Ano', adv: 'Estatísticas por Adversário' };
  document.getElementById('tituloTabTec').innerText = titulos[tipo];
  document.getElementById('btnGrpTec').className = 'btn btn-sm ' + (tipo === 'tec' ? 'btn-dark' : 'btn-outline-dark');
  document.getElementById('btnGrpComp').className = 'btn btn-sm ' + (tipo === 'comp' ? 'btn-dark' : 'btn-outline-dark');
  document.getElementById('btnGrpAno').className = 'btn btn-sm ' + (tipo === 'ano' ? 'btn-dark' : 'btn-outline-dark');
  document.getElementById('btnGrpAdv').className = 'btn btn-sm ' + (tipo === 'adv' ? 'btn-dark' : 'btn-outline-dark');
  renderizarTabelaTecnicos(dadosFiltrados);
}

function heatColor(value, min, max, rgb) {
  if (max === min) return '';
  const ratio = (value - min) / (max - min);
  return `rgba(${rgb},${(ratio * 0.6).toFixed(2)})`;
}

function renderizarTabelaTecnicos(lista) {
  const grupoCfg = {
    tec: { label: 'Técnico', title: 'Nome do Técnico', getVal: j => j.t ? j.t.toString().trim() : '' },
    comp: { label: 'Competição', title: 'Competição', getVal: j => j.c ? j.c.toString().trim() : '' },
    ano: { label: 'Ano', title: 'Ano', getVal: j => j.a ? j.a.toString().trim() : '' },
    adv: { label: 'Adversário', title: 'Adversário', getVal: j => j.adv ? j.adv.toString().trim() : '' },
  }[groupByTabTec];

  const cols = [
    { key: 'grupo', label: grupoCfg.label, title: grupoCfg.title, fmt: v => v, str: true },
    { key: 'jogos', label: 'J', title: 'Jogos', fmt: v => v, rgb: '13,110,253' },
    { key: 'vits', label: 'V', title: 'Vitórias', fmt: v => v, rgb: '111,66,193' },
    { key: 'perc_vits', label: '%V', title: '% Vitórias', fmt: v => v + '%', rgb: '111,66,193' },
    { key: 'vits1x0', label: '1x0', title: 'Vitórias por 1x0', fmt: v => v, rgb: '111,66,193' },
    { key: 'vits3', label: 'V+3', title: 'Vitórias com 3+ gols de diferença', fmt: v => v, rgb: '111,66,193' },
    { key: 'emps', label: 'E', title: 'Empates', fmt: v => v, rgb: '255,193,7' },
    { key: 'perc_emps', label: '%E', title: '% Empates', fmt: v => v + '%', rgb: '255,193,7' },
    { key: 'ders', label: 'D', title: 'Derrotas', fmt: v => v, rgb: '220,53,69' },
    { key: 'perc_ders', label: '%D', title: '% Derrotas', fmt: v => v + '%', rgb: '220,53,69' },
    { key: 'ders3', label: 'D-3', title: 'Derrotas com 3+ gols de diferença', fmt: v => v, rgb: '220,53,69' },
    { key: 'gp', label: 'GP', title: 'Gols Pró (total)', fmt: v => v, rgb: '111,66,193' },
    { key: 'media_gp', label: 'M.GP', title: 'Média de Gols Pró por jogo', fmt: v => v, rgb: '111,66,193' },
    { key: 's_mar', label: 'SM', title: 'Jogos sem marcar gol', fmt: v => v, rgb: '220,53,69' },
    { key: 'perc_s_mar', label: '%SM', title: '% de jogos sem marcar gol', fmt: v => v + '%', rgb: '220,53,69' },
    { key: 'gc', label: 'GC', title: 'Gols Contra (total)', fmt: v => v, rgb: '220,53,69' },
    { key: 'media_gc', label: 'M.GC', title: 'Média de Gols Contra por jogo', fmt: v => v, rgb: '220,53,69' },
    { key: 's_sof', label: 'SS', title: 'Jogos sem sofrer gol', fmt: v => v, rgb: '111,66,193' },
    { key: 'perc_s_sof', label: '%SS', title: '% de jogos sem sofrer gol', fmt: v => v + '%', rgb: '111,66,193' },
    { key: 'saldo', label: 'SG', title: 'Saldo de Gols', fmt: v => v, rgb: '111,66,193' },
    { key: 'pontos', label: 'Pts', title: 'Pontos conquistados', fmt: v => v, rgb: '111,66,193' },
    { key: 'aprov', label: 'Aprov%', title: 'Aproveitamento (%)', fmt: v => v + '%', rgb: '111,66,193' },
  ];

  const por = {};
  lista.forEach(j => {
    const grupo = grupoCfg.getVal(j);
    if (!grupo) return;
    if (!por[grupo]) por[grupo] = { vits: 0, emps: 0, ders: 0, gp: 0, gc: 0, sMar: 0, sSof: 0, vits3: 0, ders3: 0, total: 0, pontos: 0, vits1x0: 0 };
    const r = j.r ? j.r.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    let pro = 0, con = 0;
    if (j.p) { const g = j.p.toLowerCase().split('x'); if (g.length === 2) { pro = parseInt(g[0]) || 0; con = parseInt(g[1]) || 0; } }
    por[grupo].gp += pro; por[grupo].gc += con; por[grupo].total++;
    if (pro === 0) por[grupo].sMar++; if (con === 0) por[grupo].sSof++;
    if (r === 'VITORIA') { por[grupo].vits++; por[grupo].pontos += 3; if (pro - con >= 3) por[grupo].vits3++; if (pro === 1 && con === 0) por[grupo].vits1x0++; }
    else if (r === 'EMPATE') { por[grupo].emps++; por[grupo].pontos += 1; }
    else if (r === 'DERROTA') { por[grupo].ders++; if (con - pro >= 3) por[grupo].ders3++; }
  });

  const rows = Object.entries(por).map(([grupo, i]) => {
    const t = i.total || 1;
    return {
      grupo, jogos: i.total, vits: i.vits, perc_vits: +(i.vits / t * 100).toFixed(1), vits1x0: i.vits1x0, vits3: i.vits3,
      emps: i.emps, perc_emps: +(i.emps / t * 100).toFixed(1), ders: i.ders, perc_ders: +(i.ders / t * 100).toFixed(1), ders3: i.ders3,
      gp: i.gp, media_gp: +(i.gp / t).toFixed(2), s_mar: i.sMar, perc_s_mar: +(i.sMar / t * 100).toFixed(1),
      gc: i.gc, media_gc: +(i.gc / t).toFixed(2), s_sof: i.sSof, perc_s_sof: +(i.sSof / t * 100).toFixed(1),
      saldo: i.gp - i.gc, pontos: i.pontos, aprov: +((i.vits * 3 + i.emps) / (t * 3) * 100).toFixed(1)
    };
  });

  rows.sort((a, b) => {
    const av = a[sortColTec], bv = b[sortColTec];
    if (typeof av === 'string') return sortDirTec * av.localeCompare(bv);
    return sortDirTec * (av - bv);
  });

  const minMax = {};
  cols.forEach(c => {
    if (!c.str && c.rgb) {
      const vals = rows.map(r => r[c.key]);
      minMax[c.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
  });

  const thead = document.getElementById('tabelaTecnicosCabecalho');
  const tbody = document.getElementById('tabelaTecnicosCorpo');

  thead.innerHTML = '<tr>' + cols.map(c => {
    const arrow = c.key === sortColTec ? (sortDirTec === -1 ? ' ↓' : ' ↑') : '';
    return `<th title="${c.title}" style="cursor:pointer;white-space:nowrap;background:#000;color:#fff;font-size:0.68rem;padding:4px 6px;text-align:center;" onclick="ordenarTecnicos('${c.key}')">${c.label}${arrow}</th>`;
  }).join('') + '</tr>';

  tbody.innerHTML = rows.map(row =>
    '<tr>' + cols.map(c => {
      const val = row[c.key];
      const bg = (!c.str && c.rgb && minMax[c.key]) ? heatColor(val, minMax[c.key].min, minMax[c.key].max, c.rgb) : '';
      const align = c.str ? '' : 'text-align:center;';
      return `<td style="white-space:nowrap;font-size:0.72rem;padding:3px 5px;${align}${bg ? 'background-color:' + bg + ';' : ''}">${c.fmt(val)}</td>`;
    }).join('') + '</tr>'
  ).join('') || `<tr><td colspan="${cols.length}" class="text-center">Nenhum dado.</td></tr>`;
}

// =====================================================================
// ESTATÍSTICAS (cards de métricas)
// =====================================================================
function atualizarEstatisticas(lista) {
  let vits = 0, emps = 0, ders = 0, gp = 0, gc = 0, sMarcar = 0, sSofrer = 0, vits3 = 0, ders3 = 0, pontos = 0, vits1x0 = 0;
  lista.forEach(j => {
    const r = j.r ? j.r.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    let pro = 0, con = 0;
    if (j.p) {
      const gols = j.p.toLowerCase().split('x');
      if (gols.length === 2) {
        pro = parseInt(gols[0]) || 0; con = parseInt(gols[1]) || 0;
        gp += pro; gc += con;
        if (pro === 0) sMarcar++; if (con === 0) sSofrer++;
        if (pro === 1 && con === 0 && r === 'VITORIA') vits1x0++;
      }
    }
    if (r === 'VITORIA') { vits++; pontos += 3; if ((pro - con) >= 3) vits3++; }
    else if (r === 'EMPATE') { emps++; pontos += 1; }
    else if (r === 'DERROTA') { ders++; if ((con - pro) >= 3) ders3++; }
  });
  const total = lista.length || 1;
  const aprov = (((vits * 3 + emps) / (total * 3)) * 100).toFixed(1);
  document.getElementById('res-jogos').innerText = lista.length;
  document.getElementById('res-vits').innerText = vits;
  document.getElementById('res-vits-perc').innerText = (vits / total * 100).toFixed(1) + "%";
  document.getElementById('res-vits1x0').innerText = vits1x0;
  document.getElementById('res-vits3').innerText = vits3;
  document.getElementById('res-emps').innerText = emps;
  document.getElementById('res-emps-perc').innerText = (emps / total * 100).toFixed(1) + "%";
  document.getElementById('res-ders').innerText = ders;
  document.getElementById('res-ders-perc').innerText = (ders / total * 100).toFixed(1) + "%";
  document.getElementById('res-ders3').innerText = ders3;
  document.getElementById('res-gp').innerText = gp;
  document.getElementById('res-gp-media').innerText = (gp / total).toFixed(2);
  document.getElementById('res-zero-pro').innerText = sMarcar;
  document.getElementById('res-zero-pro-perc').innerText = (sMarcar / total * 100).toFixed(1) + "%";
  document.getElementById('res-gc').innerText = gc;
  document.getElementById('res-gc-media').innerText = (gc / total).toFixed(2);
  document.getElementById('res-zero-con').innerText = sSofrer;
  document.getElementById('res-zero-con-perc').innerText = (sSofrer / total * 100).toFixed(1) + "%";
  document.getElementById('res-sg').innerText = gp - gc;
  document.getElementById('res-pontos').innerText = pontos;
  document.getElementById('res-aprov').innerText = (lista.length > 0 ? aprov : 0) + '%';
}

// =====================================================================
// GRÁFICOS
// =====================================================================
function trocarMetrica(btn) {
  document.querySelectorAll('.btn-metrica').forEach(b => { b.classList.remove('btn-dark'); b.classList.add('btn-outline-dark'); });
  btn.classList.remove('btn-outline-dark'); btn.classList.add('btn-dark');
  metricaAtual = btn.getAttribute('data-metrica');
  document.getElementById('titulo-grafico').innerText = `Evolução de ${btn.innerText} por Ano`;
  renderizarGrafico(dadosFiltrados);
}

function renderizarGrafico(lista) {
  const dadosPorAno = {};
  const anosHistoricos = [...new Set(lista.map(j => parseInt(j.a)))].filter(Boolean).sort((a, b) => a - b);
  const labels = anosHistoricos.slice(-30);
  labels.forEach(ano => { dadosPorAno[ano] = { vits: 0, emps: 0, ders: 0, gp: 0, gc: 0, sMar: 0, sSof: 0, vits3: 0, ders3: 0, total: 0, pontos: 0, vits1x0: 0 }; });
  lista.forEach(j => {
    const ano = parseInt(j.a);
    if (!dadosPorAno[ano]) return;
    const r = j.r ? j.r.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    let pro = 0, con = 0;
    if (j.p) {
      const gols = j.p.toLowerCase().split('x');
      if (gols.length === 2) {
        pro = parseInt(gols[0]) || 0; con = parseInt(gols[1]) || 0;
        dadosPorAno[ano].gp += pro; dadosPorAno[ano].gc += con;
        if (pro === 0) dadosPorAno[ano].sMar++; if (con === 0) dadosPorAno[ano].sSof++;
        if (pro === 1 && con === 0 && r === 'VITORIA') dadosPorAno[ano].vits1x0++;
      }
    }
    if (r === 'VITORIA') { dadosPorAno[ano].vits++; dadosPorAno[ano].pontos += 3; if (pro - con >= 3) dadosPorAno[ano].vits3++; }
    else if (r === 'EMPATE') { dadosPorAno[ano].emps++; dadosPorAno[ano].pontos += 1; }
    else if (r === 'DERROTA') { dadosPorAno[ano].ders++; if (con - pro >= 3) dadosPorAno[ano].ders3++; }
    dadosPorAno[ano].total++;
  });
  const sufixo = (metricaAtual.includes("perc") || metricaAtual === "aproveitamento") ? "%" : "";
  const dataValues = labels.map(ano => {
    const i = dadosPorAno[ano]; const t = i.total || 1;
    switch (metricaAtual) {
      case "jogos": return i.total; case "vitorias": return i.vits; case "perc_vitorias": return (i.vits / t * 100).toFixed(1);
      case "vits1x0": return i.vits1x0; case "vits3": return i.vits3; case "empates": return i.emps; case "perc_empates": return (i.emps / t * 100).toFixed(1);
      case "derrotas": return i.ders; case "perc_derrotas": return (i.ders / t * 100).toFixed(1); case "ders3": return i.ders3;
      case "gols_pro": return i.gp; case "media_gols": return (i.gp / t).toFixed(2); case "s_marcar": return i.sMar;
      case "perc_s_marcar": return (i.sMar / t * 100).toFixed(1); case "gols_contra": return i.gc; case "media_gols_c": return (i.gc / t).toFixed(2);
      case "s_sofrer": return i.sSof; case "perc_s_sofrer": return (i.sSof / t * 100).toFixed(1); case "saldo": return i.gp - i.gc;
      case "pontos": return i.pontos;
      default: return ((i.vits * 3 + i.emps) / (t * 3) * 100).toFixed(1);
    }
  });
  const ctx = document.getElementById('graficoEvolucao').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, { type: 'line', plugins: [ChartDataLabels], data: { labels: labels, datasets: [{ data: dataValues, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderColor: 'rgba(0, 0, 0, 1)', borderWidth: 3, fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: 'rgba(0, 0, 0, 1)', datalabels: { anchor: 'end', align: 'top', offset: 5, formatter: (v) => v + sufixo, font: { weight: 'bold', size: 11 } } }] }, options: { responsive: true, layout: { padding: { top: 35, right: 20, left: 10 } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + sufixo }, grid: { color: 'rgba(0, 0, 0, 0.05)' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, datalabels: { color: '#000', display: true } } } });
}

function renderizarGraficoComparativo(lista) {
  const acumular = document.getElementById('fAcumulado').checked;
  const dadosPorAno = {};
  const anosHistoricos = [...new Set(lista.map(j => parseInt(j.a)))].filter(Boolean).sort((a, b) => a - b);
  const labels = anosHistoricos.slice(-30);
  labels.forEach(ano => { dadosPorAno[ano] = { vits: 0, emps: 0, ders: 0 }; });
  lista.forEach(j => {
    const ano = parseInt(j.a);
    const r = j.r ? j.r.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    if (dadosPorAno[ano]) { if (r === 'VITORIA') dadosPorAno[ano].vits++; else if (r === 'EMPATE') dadosPorAno[ano].emps++; else if (r === 'DERROTA') dadosPorAno[ano].ders++; }
  });
  let vitsData = labels.map(ano => dadosPorAno[ano].vits);
  let empsData = labels.map(ano => dadosPorAno[ano].emps);
  let dersData = labels.map(ano => dadosPorAno[ano].ders);
  if (acumular) {
    const primeiroAno = labels[0];
    let baseV = 0, baseE = 0, baseD = 0;
    lista.forEach(j => {
      if (parseInt(j.a) < primeiroAno) {
        const r = j.r ? j.r.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
        if (r === 'VITORIA') baseV++; else if (r === 'EMPATE') baseE++; else if (r === 'DERROTA') baseD++;
      }
    });
    let runV = baseV, runE = baseE, runD = baseD;
    vitsData = vitsData.map(v => runV += v);
    empsData = empsData.map(e => runE += e);
    dersData = dersData.map(d => runD += d);
  }
  const ctx = document.getElementById('graficoComparativo').getContext('2d');
  if (chartCompInstance) chartCompInstance.destroy();
  chartCompInstance = new Chart(ctx, { type: 'line', plugins: [ChartDataLabels], data: { labels: labels, datasets: [{ label: 'Vitórias', data: vitsData, borderColor: '#0d6efd', backgroundColor: 'transparent', borderWidth: 3, tension: 0.3, pointRadius: 4, datalabels: { color: '#0d6efd', align: 'top', offset: 4 } }, { label: 'Empates', data: empsData, borderColor: '#ffc107', backgroundColor: 'transparent', borderWidth: 3, tension: 0.3, pointRadius: 4, datalabels: { color: '#ffc107', align: 'top', offset: 4 } }, { label: 'Derrotas', data: dersData, borderColor: '#dc3545', backgroundColor: 'transparent', borderWidth: 3, tension: 0.3, pointRadius: 4, datalabels: { color: '#dc3545', align: 'top', offset: 4 } }] }, options: { responsive: true, layout: { padding: { top: 35, right: 30 } }, plugins: { legend: { display: true, position: 'top' }, datalabels: { font: { weight: 'bold', size: 9 }, formatter: Math.round } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } }, x: { grid: { display: false } } } } });
}

// =====================================================================
// PAGINAÇÃO E TABELA PRINCIPAL
// =====================================================================
function mudarPagina(direcao) { paginaAtual += direcao; render(); }

function render() {
  const corpo = document.getElementById('tabelaCorpo');
  const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina) || 1;
  if (paginaAtual < 1) paginaAtual = 1;
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const dadosPagina = dadosFiltrados.slice(inicio, inicio + itensPorPagina);
  corpo.innerHTML = dadosPagina.map(j => {
    let cl = '';
    const r = j.r ? j.r.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : '';
    if (r === 'VITORIA') cl = 'vitoria'; else if (r === 'EMPATE') cl = 'empate'; else if (r === 'DERROTA') cl = 'derrota';
    const esc = v => (v || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const videoCell = j.lnk ? `<td class="text-center"><button class="btn-play" data-link="${esc(j.lnk)}" title="Assistir jogo">▶</button></td>` : '<td></td>';
    return `<tr class="${cl}"><td>${j.d}</td><td class="filtro-celula" data-filtro="comp" data-valor="${esc(j.c)}">${j.c}</td><td class="text-center"><span class="placar">${j.p}</span></td><td class="filtro-celula" data-filtro="adv" data-valor="${esc(j.adv)}">${j.adv}</td><td class="filtro-celula" data-filtro="mando" data-valor="${esc(j.m)}">${j.m}</td><td class="filtro-celula" data-filtro="est" data-valor="${esc(j.e)}">${j.e}</td><td class="filtro-celula" data-filtro="tec" data-valor="${esc(j.t)}">${j.t}</td>${videoCell}</tr>`;
  }).join('') || '<tr><td colspan="8" class="text-center">Nenhum jogo encontrado.</td></tr>';
  document.getElementById('pAtual').innerText = paginaAtual;
  document.getElementById('pTotal').innerText = totalPaginas;
  document.getElementById('btnAnt').disabled = (paginaAtual <= 1);
  document.getElementById('btnProx').disabled = (paginaAtual >= totalPaginas);
  document.querySelector('.table-responsive').scrollTop = 0;
}
