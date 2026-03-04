/**
 * auth.js — Módulo de autenticação Supabase (Google OAuth)
 * Expõe globalmente: authDB, getUser, getNivel, isAdmin, isPremium,
 *                    entrarComGoogle, sair, onAuthReady
 *
 * Inclua APÓS o SDK do Supabase:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
 *   <script src="auth.js"></script>
 */
(function () {
  /* ── Credenciais ──────────────────────────────────────────── */
  const SUPABASE_URL = 'https://xtdavfobpodxeawaygtn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_B9X6t6kanjvTmGa8zEAF6w_MqxxcZh4';

  const { createClient } = window.supabase;
  const authDB = createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ── Estado interno ───────────────────────────────────────── */
  let _user  = null;
  let _nivel = null;   // 'comum' | 'premium' | 'admin'
  let _ready = false;
  let _readyCbs = [];

  /* ── CSS injetado ─────────────────────────────────────────── */
  (function injetarCSS() {
    if (document.getElementById('auth-style')) return;
    const s = document.createElement('style');
    s.id = 'auth-style';
    s.textContent = `
      #auth-header {
        display: flex; align-items: center; gap: 8px;
      }
      .auth-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 13px; border-radius: 8px; border: 1px solid #e4e4e7;
        font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 600;
        cursor: pointer; white-space: nowrap; transition: all 0.15s;
        text-decoration: none; line-height: 1;
      }
      .auth-btn-login {
        background: #fff; color: #18181b;
      }
      .auth-btn-login:hover { border-color: #a1a1aa; background: #f9f9fb; }
      .auth-btn-logout {
        background: none; color: #71717a;
      }
      .auth-btn-logout:hover { color: #18181b; border-color: #a1a1aa; }
      .auth-avatar {
        width: 26px; height: 26px; border-radius: 50%;
        object-fit: cover; border: 1px solid #e4e4e7;
      }
      .auth-name {
        font-size: 0.75rem; font-weight: 600; color: #18181b;
        max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .auth-badge {
        font-size: 0.58rem; font-weight: 700; letter-spacing: 0.8px;
        text-transform: uppercase; padding: 2px 7px; border-radius: 10px;
      }
      .auth-badge-admin   { background: #fef9c3; color: #854d0e; }
      .auth-badge-premium { background: #dbeafe; color: #1e40af; }
      .auth-loading {
        font-size: 0.72rem; color: #a1a1aa;
      }
      @media (max-width: 480px) {
        .auth-name { display: none; }
        .auth-badge { display: none; }
      }
    `;
    document.head.appendChild(s);
  })();

  /* ── Carrega nivel_acesso da tabela perfis ────────────────── */
  async function _carregarPerfil(user) {
    if (!user) { _nivel = null; return; }
    try {
      const { data } = await authDB
        .from('perfis')
        .select('nivel_acesso')
        .eq('id', user.id)
        .single();
      _nivel = data?.nivel_acesso || 'comum';
    } catch (_) {
      _nivel = 'comum';
    }
  }

  /* ── Renderiza o bloco de auth no header ──────────────────── */
  function _renderAuthHeader() {
    const el = document.getElementById('auth-header');
    if (!el) return;

    if (!_user) {
      el.innerHTML =
        `<button class="auth-btn auth-btn-login" onclick="entrarComGoogle()">` +
        `<svg width="14" height="14" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">` +
        `<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>` +
        `<path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8C43.8 37.1 46.5 31.2 46.5 24.5z"/>` +
        `<path fill="#FBBC05" d="M10.6 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8.1-6z"/>` +
        `<path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-8.1 6C6.7 42.6 14.7 48 24 48z"/>` +
        `</svg>` +
        `Entrar com Google</button>`;
    } else {
      const foto  = _user.user_metadata?.avatar_url  || '';
      const nome  = _user.user_metadata?.full_name   || _user.email || '';
      const badge = _nivel === 'admin'
        ? `<span class="auth-badge auth-badge-admin">Admin</span>`
        : _nivel === 'premium'
        ? `<span class="auth-badge auth-badge-premium">Premium</span>`
        : '';
      const avatarHTML = foto
        ? `<img src="${foto}" class="auth-avatar" alt="">`
        : '';
      el.innerHTML =
        avatarHTML +
        `<span class="auth-name">${_escHtml(nome)}</span>` +
        badge +
        `<button class="auth-btn auth-btn-logout" onclick="sair()">Sair</button>`;
    }

    /* Dispara evento para que a página reaja à mudança de estado */
    document.dispatchEvent(new CustomEvent('auth:update', {
      detail: { user: _user, nivel: _nivel }
    }));
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Inicialização: escuta mudanças de sessão ─────────────── */
  authDB.auth.onAuthStateChange(async function (event, session) {
    _user = session?.user || null;
    await _carregarPerfil(_user);
    _renderAuthHeader();

    if (!_ready) {
      _ready = true;
      const payload = { user: _user, nivel: _nivel };
      _readyCbs.forEach(function (cb) { cb(payload); });
      _readyCbs = [];
    }
  });

  /* ── API pública ──────────────────────────────────────────── */
  function onAuthReady(cb) {
    if (_ready) cb({ user: _user, nivel: _nivel });
    else _readyCbs.push(cb);
  }

  async function entrarComGoogle() {
    await authDB.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    });
  }

  async function sair() {
    await authDB.auth.signOut();
  }

  function getUser()    { return _user; }
  function getNivel()   { return _nivel; }
  function isAdmin()    { return _nivel === 'admin'; }
  function isPremium()  { return _nivel === 'admin' || _nivel === 'premium'; }

  /* Expõe globalmente */
  window.authDB          = authDB;
  window.getUser         = getUser;
  window.getNivel        = getNivel;
  window.isAdmin         = isAdmin;
  window.isPremium       = isPremium;
  window.entrarComGoogle = entrarComGoogle;
  window.sair            = sair;
  window.onAuthReady     = onAuthReady;
})();
