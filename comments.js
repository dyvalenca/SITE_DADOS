/**
 * comments.js — Widget de comentários aninhados
 * Uso: <div id="nf-comments-wrap"></div>
 * Requer auth.js carregado antes.
 */
(function () {
  'use strict';

  var PAGE_URL = window.location.pathname;

  // ── CSS injetado ──────────────────────────────────────────────────────────

  function injetarCSS() {
    if (document.getElementById('nf-cm-style')) return;
    var s = document.createElement('style');
    s.id = 'nf-cm-style';
    s.textContent = `
      .nf-cm-secao {
        max-width: 720px; margin: 0 auto 48px; padding: 0 20px;
        font-family: 'Inter', sans-serif;
      }
      .nf-cm-titulo {
        font-size: 1rem; font-weight: 800; letter-spacing: -0.3px;
        color: #18181b; margin-bottom: 20px;
        padding-bottom: 14px; border-bottom: 1px solid #e4e4e7;
      }
      /* ── Form ── */
      .nf-cm-form { margin-bottom: 24px; }
      .nf-cm-textarea {
        width: 100%; border: 1px solid #e4e4e7; border-radius: 10px;
        padding: 10px 14px; font-family: 'Inter', sans-serif;
        font-size: 0.85rem; color: #18181b; resize: vertical;
        outline: none; transition: border-color 0.15s; background: #fff;
      }
      .nf-cm-textarea:focus { border-color: #2563eb; }
      .nf-cm-form-actions {
        display: flex; justify-content: space-between; align-items: center;
        margin-top: 8px;
      }
      .nf-cm-chars { font-size: 0.7rem; color: #a1a1aa; }
      .nf-cm-btn-enviar {
        background: #18181b; color: #fff; border: none; border-radius: 8px;
        padding: 8px 18px; font-size: 0.78rem; font-weight: 700;
        font-family: 'Inter', sans-serif; cursor: pointer;
        transition: background 0.15s;
      }
      .nf-cm-btn-enviar:hover { background: #3f3f46; }
      .nf-cm-btn-enviar:disabled { background: #a1a1aa; cursor: not-allowed; }
      .nf-cm-btn-cancelar {
        background: none; border: 1px solid #e4e4e7; border-radius: 8px;
        padding: 8px 14px; font-size: 0.78rem; font-weight: 600; color: #71717a;
        font-family: 'Inter', sans-serif; cursor: pointer; transition: border-color 0.15s;
      }
      .nf-cm-btn-cancelar:hover { border-color: #a1a1aa; }
      .nf-cm-login-prompt {
        background: #f4f4f5; border-radius: 10px; padding: 14px 16px;
        font-size: 0.82rem; color: #71717a; margin-bottom: 24px;
      }
      .nf-cm-login-prompt a { color: #2563eb; font-weight: 600; text-decoration: none; }
      .nf-cm-login-prompt a:hover { text-decoration: underline; }
      .nf-cm-enviado {
        margin-top: 8px; font-size: 0.78rem; font-weight: 600;
        background: #dbeafe; color: #1e40af;
        border-radius: 8px; padding: 8px 12px;
      }
      /* ── Lista ── */
      .nf-cm-vazio { font-size: 0.85rem; color: #a1a1aa; text-align: center; padding: 28px 0; }
      .nf-cm-loading { font-size: 0.82rem; color: #a1a1aa; padding: 20px 0; }
      /* ── Item ── */
      .nf-cm-item {
        display: flex; flex-direction: column; gap: 8px;
        padding: 14px 0; border-bottom: 1px solid #f4f4f5;
      }
      .nf-cm-item:last-child { border-bottom: none; }
      .nf-cm-resposta {
        margin-left: 44px; padding-left: 14px;
        border-left: 2px solid #e4e4e7; border-bottom: none;
        padding-top: 10px; padding-bottom: 4px;
      }
      .nf-cm-item-header { display: flex; align-items: center; gap: 10px; }
      .nf-cm-avatar {
        width: 34px; height: 34px; border-radius: 50%;
        object-fit: cover; border: 1px solid #e4e4e7; flex-shrink: 0;
      }
      .nf-cm-avatar-fallback {
        width: 34px; height: 34px; border-radius: 50%;
        background: #e4e4e7; display: flex; align-items: center;
        justify-content: center; font-size: 0.85rem; font-weight: 700;
        color: #71717a; flex-shrink: 0;
      }
      .nf-cm-item-meta { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
      .nf-cm-autor { font-size: 0.82rem; font-weight: 700; color: #18181b; }
      .nf-cm-data { font-size: 0.72rem; color: #a1a1aa; }
      .nf-cm-badge-pendente {
        font-size: 0.62rem; font-weight: 700; letter-spacing: 0.5px;
        background: #fef9c3; color: #854d0e; border-radius: 6px; padding: 2px 8px;
      }
      .nf-cm-conteudo {
        font-size: 0.85rem; color: #3f3f46; line-height: 1.65;
        padding-left: 44px; white-space: pre-wrap; word-break: break-word;
      }
      .nf-cm-resposta .nf-cm-conteudo { padding-left: 0; }
      /* ── Ações ── */
      .nf-cm-acoes {
        display: flex; align-items: center; gap: 8px;
        padding-left: 44px;
      }
      .nf-cm-resposta .nf-cm-acoes { padding-left: 0; }
      .nf-cm-like-btn {
        background: none; border: 1px solid #e4e4e7; border-radius: 20px;
        padding: 3px 10px; font-size: 0.75rem; color: #71717a;
        cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
        display: inline-flex; align-items: center; gap: 4px;
      }
      .nf-cm-like-btn:hover { border-color: #a1a1aa; color: #18181b; }
      .nf-cm-like-btn.ativo { background: #dbeafe; border-color: #93c5fd; color: #1e40af; }
      .nf-cm-reply-btn {
        background: none; border: none; font-size: 0.75rem;
        color: #a1a1aa; cursor: pointer; font-family: 'Inter', sans-serif;
        padding: 3px 6px; border-radius: 6px; transition: color 0.15s;
      }
      .nf-cm-reply-btn:hover { color: #18181b; background: #f4f4f5; }
      .nf-cm-del-btn {
        background: none; border: none; font-size: 0.75rem;
        color: #fca5a5; cursor: pointer; font-family: 'Inter', sans-serif;
        padding: 3px 6px; border-radius: 6px; margin-left: auto;
        transition: color 0.15s, background 0.15s;
      }
      .nf-cm-del-btn:hover { color: #991b1b; background: #fee2e2; }
      /* ── Form resposta ── */
      .nf-cm-form-reply { margin: 10px 0 0 44px; }
      @media (max-width: 480px) {
        .nf-cm-resposta { margin-left: 20px; }
        .nf-cm-conteudo { padding-left: 0; }
        .nf-cm-acoes { padding-left: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Utilitários ──────────────────────────────────────────────────────────

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatarData(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return ('0' + d.getDate()).slice(-2) + '/' +
           ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  }

  function db() { return window.authDB; }

  // ── Renderizadores ───────────────────────────────────────────────────────

  function renderShell(wrap) {
    wrap.innerHTML =
      '<div class="nf-cm-secao">' +
        '<div class="nf-cm-titulo">Comentários</div>' +
        '<div id="nf-cm-form-area"></div>' +
        '<div id="nf-cm-lista"><p class="nf-cm-loading">Carregando comentários…</p></div>' +
      '</div>';
  }

  function renderForm(user) {
    var el = document.getElementById('nf-cm-form-area');
    if (!el) return;
    if (!user) {
      el.innerHTML =
        '<div class="nf-cm-login-prompt">' +
          'Faça <a href="#" onclick="entrarComGoogle();return false;">login com Google</a> para comentar.' +
        '</div>';
      return;
    }
    el.innerHTML =
      '<div class="nf-cm-form">' +
        '<textarea id="nf-cm-texto" class="nf-cm-textarea" placeholder="Escreva um comentário…" maxlength="1000" rows="3"></textarea>' +
        '<div class="nf-cm-form-actions">' +
          '<span class="nf-cm-chars" id="nf-cm-chars">0 / 1000</span>' +
          '<button class="nf-cm-btn-enviar" id="nf-cm-btn-enviar" onclick="nfCmEnviar()">Publicar</button>' +
        '</div>' +
      '</div>';
    document.getElementById('nf-cm-texto').addEventListener('input', function () {
      document.getElementById('nf-cm-chars').textContent = this.value.length + ' / 1000';
    });
  }

  function renderLista(comments, likes, user) {
    var el = document.getElementById('nf-cm-lista');
    if (!el) return;

    var aprovados = comments.filter(function (c) { return c.STATUS === 'APROVADO'; });
    var proprios   = user ? comments.filter(function (c) { return c.STATUS === 'PENDENTE' && c.IDUSER === user.id; }) : [];
    var visiveis   = aprovados.concat(proprios);

    // Admin vê tudo pendente
    if (window.isAdmin && window.isAdmin()) {
      var pendentesOutros = comments.filter(function (c) {
        return c.STATUS === 'PENDENTE' && (!user || c.IDUSER !== user.id);
      });
      visiveis = aprovados.concat(comments.filter(function (c) { return c.STATUS === 'PENDENTE'; }));
    }

    if (visiveis.length === 0) {
      el.innerHTML = '<p class="nf-cm-vazio">Nenhum comentário ainda. Seja o primeiro!</p>';
      return;
    }

    // Mapas de likes
    var likeMap  = {};  // { commentId: { LIKE: n, DISLIKE: n } }
    var userLikes = {}; // { 'commentId_TIPO': true }
    (likes || []).forEach(function (l) {
      if (!likeMap[l.IDCOMMENT]) likeMap[l.IDCOMMENT] = { LIKE: 0, DISLIKE: 0 };
      likeMap[l.IDCOMMENT][l.TIPO] = (likeMap[l.IDCOMMENT][l.TIPO] || 0) + 1;
      if (user && l.IDUSER === user.id) userLikes[l.IDCOMMENT + '_' + l.TIPO] = true;
    });

    var pais      = visiveis.filter(function (c) { return !c.ID_COMENTARIO_PAI; });
    var respostas = visiveis.filter(function (c) { return  c.ID_COMENTARIO_PAI; });

    el.innerHTML = pais.map(function (pai) {
      var filhos = respostas.filter(function (r) { return r.ID_COMENTARIO_PAI === pai.IDCOMMENT; });
      return renderItem(pai, likeMap, userLikes, user, false) +
        (filhos.length
          ? '<div>' + filhos.map(function (f) { return renderItem(f, likeMap, userLikes, user, true); }).join('') + '</div>'
          : '');
    }).join('');
  }

  function renderItem(c, likeMap, userLikes, user, isResposta) {
    var perfil = c.perfis || {};
    var nome   = perfil.NOME_EXIBICAO || 'Usuário';
    var foto   = perfil.foto_url      || '';
    var lk     = likeMap[c.IDCOMMENT] || { LIKE: 0, DISLIKE: 0 };
    var meuLike    = userLikes[c.IDCOMMENT + '_LIKE'];
    var meuDislike = userLikes[c.IDCOMMENT + '_DISLIKE'];
    var isPendente = c.STATUS === 'PENDENTE';
    var podeDeletar = user && (c.IDUSER === user.id || (window.isAdmin && window.isAdmin()));

    var avatarHtml = foto
      ? '<img src="' + esc(foto) + '" class="nf-cm-avatar" alt="" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
        '<div class="nf-cm-avatar nf-cm-avatar-fallback" style="display:none">' + esc(nome.charAt(0).toUpperCase()) + '</div>'
      : '<div class="nf-cm-avatar nf-cm-avatar-fallback">' + esc(nome.charAt(0).toUpperCase()) + '</div>';

    return (
      '<div class="nf-cm-item' + (isResposta ? ' nf-cm-resposta' : '') + '" data-id="' + c.IDCOMMENT + '">' +
        '<div class="nf-cm-item-header">' +
          avatarHtml +
          '<div class="nf-cm-item-meta">' +
            '<span class="nf-cm-autor">' + esc(nome) + '</span>' +
            '<span class="nf-cm-data">' + formatarData(c.DATA_COMENTARIO) + '</span>' +
            (isPendente ? '<span class="nf-cm-badge-pendente">Aguardando aprovação</span>' : '') +
          '</div>' +
          (podeDeletar
            ? '<button class="nf-cm-del-btn" onclick="nfCmExcluir(' + c.IDCOMMENT + ')" title="Excluir comentário">🗑️</button>'
            : '') +
        '</div>' +
        '<div class="nf-cm-conteudo">' + esc(c.CONTEUDO) + '</div>' +
        (!isPendente
          ? '<div class="nf-cm-acoes">' +
              '<button class="nf-cm-like-btn' + (meuLike ? ' ativo' : '') + '" onclick="nfCmLike(' + c.IDCOMMENT + ',\'LIKE\')">👍 ' + lk.LIKE + '</button>' +
              '<button class="nf-cm-like-btn' + (meuDislike ? ' ativo' : '') + '" onclick="nfCmLike(' + c.IDCOMMENT + ',\'DISLIKE\')">👎 ' + lk.DISLIKE + '</button>' +
              (!isResposta && user
                ? '<button class="nf-cm-reply-btn" onclick="nfCmAbrirResposta(' + c.IDCOMMENT + ')">↩ Responder</button>'
                : '') +
            '</div>'
          : '') +
        '<div id="nf-cm-reply-' + c.IDCOMMENT + '"></div>' +
      '</div>'
    );
  }

  // ── Carregamento ─────────────────────────────────────────────────────────

  async function carregar(user) {
    var d = db();
    if (!d) return;

    var { data: comments } = await d
      .from('COMMENT')
      .select('IDCOMMENT, CONTEUDO, DATA_COMENTARIO, STATUS, ID_COMENTARIO_PAI, IDUSER, perfis(NOME_EXIBICAO, foto_url)')
      .eq('PAGINA_URL', PAGE_URL)
      .order('DATA_COMENTARIO', { ascending: true });

    var ids = (comments || []).map(function (c) { return c.IDCOMMENT; });
    var likes = [];
    if (ids.length > 0) {
      var res = await d
        .from('COMMENT_LIKE')
        .select('IDCOMMENT, TIPO, IDUSER')
        .in('IDCOMMENT', ids);
      likes = res.data || [];
    }

    renderForm(user);
    renderLista(comments || [], likes, user);
  }

  // ── API global ───────────────────────────────────────────────────────────

  window.nfCmEnviar = async function (parentId, textareaId) {
    var tid      = textareaId || 'nf-cm-texto';
    var textarea = document.getElementById(tid);
    if (!textarea) return;
    var conteudo = textarea.value.trim();
    if (!conteudo) { textarea.focus(); return; }

    var user = window.getUser && window.getUser();
    if (!user) return;

    var btn = document.getElementById(textareaId ? 'nf-cm-btn-reply-' + parentId : 'nf-cm-btn-enviar');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

    var d = db();
    var status = (window.isAdmin && window.isAdmin()) ? 'APROVADO' : 'PENDENTE';
    var { error } = await d.from('COMMENT').insert({
      PAGINA_URL: PAGE_URL,
      IDUSER: user.id,
      ID_COMENTARIO_PAI: parentId || null,
      CONTEUDO: conteudo,
      STATUS: status,
    });

    if (btn) { btn.disabled = false; btn.textContent = parentId ? 'Responder' : 'Publicar'; }

    if (!error) {
      textarea.value = '';
      if (parentId) {
        document.getElementById('nf-cm-reply-' + parentId).innerHTML = '';
      } else {
        var msgEl = document.createElement('div');
        msgEl.className = 'nf-cm-enviado';
        msgEl.textContent = 'Comentário enviado! Aguardando aprovação.';
        textarea.parentElement.insertBefore(msgEl, textarea.nextSibling);
        setTimeout(function () { msgEl.remove(); }, 5000);
      }
      // Recarrega lista
      await carregar(user);
    }
  };

  window.nfCmAbrirResposta = function (parentId) {
    var wrap = document.getElementById('nf-cm-reply-' + parentId);
    if (!wrap) return;
    var user = window.getUser && window.getUser();
    if (!user) { window.entrarComGoogle && window.entrarComGoogle(); return; }

    // Fecha outros formulários de resposta abertos
    document.querySelectorAll('[id^="nf-cm-reply-"]').forEach(function (el) {
      if (el.id !== 'nf-cm-reply-' + parentId) el.innerHTML = '';
    });

    var tid = 'nf-cm-texto-' + parentId;
    wrap.innerHTML =
      '<div class="nf-cm-form nf-cm-form-reply">' +
        '<textarea id="' + tid + '" class="nf-cm-textarea" placeholder="Escreva uma resposta…" maxlength="500" rows="2"></textarea>' +
        '<div class="nf-cm-form-actions">' +
          '<button class="nf-cm-btn-cancelar" onclick="document.getElementById(\'nf-cm-reply-' + parentId + '\').innerHTML=\'\'">Cancelar</button>' +
          '<button class="nf-cm-btn-enviar" id="nf-cm-btn-reply-' + parentId + '" onclick="nfCmEnviar(' + parentId + ',\'' + tid + '\')">Responder</button>' +
        '</div>' +
      '</div>';

    document.getElementById(tid).focus();
  };

  window.nfCmLike = async function (commentId, tipo) {
    var user = window.getUser && window.getUser();
    if (!user) { window.entrarComGoogle && window.entrarComGoogle(); return; }

    var d = db();
    var { data: existing } = await d
      .from('COMMENT_LIKE')
      .select('IDLIKE')
      .eq('IDCOMMENT', commentId)
      .eq('IDUSER', user.id)
      .eq('TIPO', tipo)
      .maybeSingle();

    if (existing) {
      await d.from('COMMENT_LIKE').delete().eq('IDLIKE', existing.IDLIKE);
    } else {
      // Remove oposto se existir
      await d.from('COMMENT_LIKE').delete()
        .eq('IDCOMMENT', commentId)
        .eq('IDUSER', user.id)
        .eq('TIPO', tipo === 'LIKE' ? 'DISLIKE' : 'LIKE');
      await d.from('COMMENT_LIKE').insert({ IDCOMMENT: commentId, IDUSER: user.id, TIPO: tipo });
    }
    await carregar(user);
  };

  window.nfCmExcluir = async function (commentId) {
    if (!confirm('Excluir este comentário? As respostas também serão removidas.')) return;
    var user = window.getUser && window.getUser();
    if (!user) return;
    var d = db();
    var { error } = await d.from('COMMENT').delete().eq('IDCOMMENT', commentId);
    if (!error) await carregar(user);
  };

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    var wrap = document.getElementById('nf-comments-wrap');
    if (!wrap) return;
    injetarCSS();
    renderShell(wrap);

    if (typeof window.onAuthReady === 'function') {
      window.onAuthReady(function (p) { carregar(p.user); });
    } else {
      carregar(null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
