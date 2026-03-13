/**
 * widget.js — Widgets dinâmicos Números Fieis
 *
 * Uso:
 *   <div data-widget="artilheiros-estadio" data-estadio="NEO QUIMICA ARENA"></div>
 *
 * Inclua ao final do <body>:
 *   <script src="/widget.js"></script>
 */
(function () {
  'use strict';

  var API_URL   = '/api/dados';
  var CACHE_KEY_JOGOS = 'nf_dados_cache';
  var CACHE_KEY_GOLS  = 'nf_gols_cache';

  // ── Utilitários ─────────────────────────────────────────────────────────────

  function norm(str) {
    return (str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function escHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatarData(valor) {
    if (!valor) return '';
    if (typeof valor === 'string' && valor.includes('/')) return valor;
    try {
      var d = new Date(valor);
      if (isNaN(d)) return String(valor);
      return ('0' + d.getUTCDate()).slice(-2) + '/' +
             ('0' + (d.getUTCMonth() + 1)).slice(-2) + '/' + d.getUTCFullYear();
    } catch (e) { return String(valor); }
  }

  function normRow(rawRow) {
    var out = {};
    Object.keys(rawRow).forEach(function (k) {
      var nk = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]/g, '');
      out[nk] = rawRow[k];
    });
    return out;
  }

  function campo(nrow, key) {
    var nk = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]/g, '');
    var v = nrow[nk];
    return (v !== undefined && v !== null) ? String(v).trim() : '';
  }

  // ── Renderizadores ──────────────────────────────────────────────────────────

  function renderLoading(el) {
    el.innerHTML =
      '<div class="nf-widget-loading">' +
        '<div class="nf-widget-spinner"></div>' +
        '<span>Carregando...</span>' +
      '</div>';
  }

  function renderErro(el, msg) {
    el.innerHTML =
      '<div class="nf-widget-erro">⚠️ ' + escHtml(msg) + '</div>';
  }

  function renderArtilheiros(el, estadio, ranking) {
    if (!ranking || ranking.length === 0) {
      renderErro(el, 'Nenhum gol registrado para este estádio.');
      return;
    }

    var tituloLabel = estadio
      .toLowerCase()
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });

    var linhas = ranking.map(function (row, i) {
      var pos     = i + 1;
      var medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos + 'º';
      var barra   = Math.round((row.total_gols / ranking[0].total_gols) * 100);
      return (
        '<tr class="nf-art-row">' +
          '<td class="nf-art-pos">' + medalha + '</td>' +
          '<td class="nf-art-nome">' + escHtml(row.jogador) + '</td>' +
          '<td class="nf-art-barra">' +
            '<div class="nf-art-barra-outer">' +
              '<div class="nf-art-barra-inner" style="width:' + barra + '%"></div>' +
            '</div>' +
          '</td>' +
          '<td class="nf-art-gols">' + row.total_gols +
            ' <span class="nf-art-label">gol' + (row.total_gols !== 1 ? 's' : '') + '</span>' +
          '</td>' +
        '</tr>'
      );
    }).join('');

    el.innerHTML =
      '<div class="nf-widget">' +
        '<div class="nf-widget-header">' +
          '<span class="nf-widget-icon">⚽</span>' +
          '<span class="nf-widget-titulo">Artilheiros — ' + escHtml(tituloLabel) + '</span>' +
        '</div>' +
        '<table class="nf-widget-table"><tbody>' + linhas + '</tbody></table>' +
        '<div class="nf-widget-footer">' +
          'Dados: <a href="https://www.numerosfieis.com.br" target="_blank" rel="noopener">numerosfieis.com.br</a>' +
        '</div>' +
      '</div>';
  }

  // ── Cálculo client-side ─────────────────────────────────────────────────────

  function calcularRanking(estadio, rawJogos, rawGols) {
    // Normaliza jogos e monta Set de datas do estádio
    var datasEstadio = new Set();
    rawJogos.forEach(function (rawRow) {
      var row = normRow(rawRow);
      var est = norm(campo(row, 'ESTADIO'));
      if (est === norm(estadio)) {
        var data = formatarData(campo(row, 'DATA'));
        if (data) datasEstadio.add(data);
      }
    });

    if (datasEstadio.size === 0) return [];

    // Agrupa gols por jogador
    var mapa = {};
    rawGols.forEach(function (rawRow) {
      var row    = normRow(rawRow);
      var data   = formatarData(campo(row, 'DATA'));
      var jogador = campo(row, 'JOGADORGOL');
      var posicao = norm(campo(row, 'POSICAO'));

      if (!data || !jogador) return;
      if (!datasEstadio.has(data)) return;
      if (posicao === 'CONTRA') return;     // gol contra
      if (jogador.charAt(0) === '*') return; // marcação de contra-gol

      mapa[jogador] = (mapa[jogador] || 0) + 1;
    });

    return Object.keys(mapa)
      .map(function (j) { return { jogador: j, total_gols: mapa[j] }; })
      .sort(function (a, b) { return b.total_gols - a.total_gols; })
      .slice(0, 10);
  }

  // ── Fetch com cache sessionStorage ─────────────────────────────────────────

  function lerCache(key) {
    try { var c = sessionStorage.getItem(key); return c ? JSON.parse(c) : null; } catch (e) { return null; }
  }

  function salvarCache(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
  }

  function fetchComCache(url, cacheKey) {
    var cached = lerCache(cacheKey);
    if (cached) return Promise.resolve(cached);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' em ' + url);
        return res.json();
      })
      .then(function (json) {
        if (json.erro) throw new Error(json.erro);
        salvarCache(cacheKey, json.data);
        return json.data;
      });
  }

  // ── Carregamento do widget ──────────────────────────────────────────────────

  function carregarWidget(el, estadio) {
    renderLoading(el);

    Promise.all([
      fetchComCache(API_URL + '?aba=jogo&limit=9999', CACHE_KEY_JOGOS),
      fetchComCache(API_URL + '?aba=gol&limit=9999',  CACHE_KEY_GOLS),
    ])
    .then(function (resultados) {
      var rawJogos = resultados[0];
      var rawGols  = resultados[1];
      var ranking  = calcularRanking(estadio, rawJogos, rawGols);
      renderArtilheiros(el, estadio, ranking);
    })
    .catch(function (err) {
      renderErro(el, 'Erro ao carregar dados: ' + err.message);
      console.error('[nf-widget]', err);
    });
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  function init() {
    var elementos = document.querySelectorAll('[data-widget="artilheiros-estadio"]');
    elementos.forEach(function (el) {
      var estadio = (el.getAttribute('data-estadio') || '').trim().toUpperCase();
      if (!estadio) { renderErro(el, 'Atributo data-estadio não informado.'); return; }
      carregarWidget(el, estadio);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
