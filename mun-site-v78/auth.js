/* Delegate login.
 *
 * Credentials are verified by the CloudBase `delegates_api` function. The
 * first-party cookie only keeps the display session on this device; every
 * seat lookup is re-checked against the backend with the name and number.
 */
(() => {
  'use strict';

  const COOKIE_NAME = 'sjtumunc_delegate';
  const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
  const t = (key, values = {}) => (typeof window.munTranslate === 'function' ? window.munTranslate(key, values) : key);

  let session = null;
  let els = null;
  let lastFocus = null;

  function readCookie(name) {
    const prefix = name + '=';
    const parts = document.cookie ? document.cookie.split(';') : [];
    for (const part of parts) {
      const value = part.trim();
      if (value.startsWith(prefix)) return value.slice(prefix.length);
    }
    return '';
  }

  function writeCookie(value, maxAge) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  }

  function readSession() {
    const raw = readCookie(COOKIE_NAME);
    if (!raw) return null;
    try {
      const data = JSON.parse(decodeURIComponent(raw));
      const valid = data
        && data.v === 2
        && typeof data.name === 'string'
        && data.name.length > 0
        && typeof data.id === 'string'
        && data.id.length > 0
        && Number.isFinite(data.exp)
        && data.exp > Date.now();
      if (!valid) {
        writeCookie('', 0);
        return null;
      }
      return data;
    } catch {
      writeCookie('', 0);
      return null;
    }
  }

  function saveSession(name, id, committee, committeeName) {
    const data = {
      v: 2,
      name,
      id,
      committee: committee || '',
      committeeName: committeeName || '',
      exp: Date.now() + COOKIE_MAX_AGE * 1000,
    };
    writeCookie(encodeURIComponent(JSON.stringify(data)), COOKIE_MAX_AGE);
    session = data;
    emitAuth();
  }

  function clearSession() {
    writeCookie('', 0);
    session = null;
    emitAuth();
  }

  function emitAuth() {
    window.dispatchEvent(new CustomEvent('sjtumunc:authchange', {
      detail: { session: session ? { ...session } : null },
    }));
  }

  function notifyShell(open) {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'mun-auth-open', open: Boolean(open) }, '*');
      }
    } catch {
      // Not embedded (or cross-origin parent); the modal still works.
    }
  }

  function setMenuLabel() {
    if (!els) return;
    els.menuLabel.replaceChildren();
    if (!session) return;
    const title = document.createElement('span');
    title.textContent = t('auth.menuLabel') + ' ';
    const detail = document.createElement('small');
    detail.textContent = `${session.name} · ${session.id}`;
    els.menuLabel.append(title, detail);
  }

  function render() {
    if (!els) return;
    const authed = Boolean(session);
    els.button.classList.toggle('is-authed', authed);
    els.button.querySelector('.auth-label').textContent = authed
      ? t('auth.welcome', { name: session.name })
      : t('auth.login');
    els.button.setAttribute('aria-label', authed
      ? t('auth.accountAria', { name: session.name })
      : t('auth.loginAria'));
    els.button.setAttribute('aria-haspopup', authed ? 'menu' : 'dialog');
    els.button.setAttribute('aria-expanded', authed && !els.menu.hidden ? 'true' : 'false');
    els.menu.hidden = true;
    setMenuLabel();
  }

  function openMenu() {
    if (!session || !els) return;
    els.menu.hidden = false;
    els.button.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    if (!els) return;
    els.menu.hidden = true;
    els.button.setAttribute('aria-expanded', 'false');
  }

  function applyAuthLanguage() {
    if (!els) return;
    els.title.textContent = t('auth.title');
    els.sub.textContent = t('auth.subtitle');
    els.nameLabel.textContent = t('auth.name');
    els.name.placeholder = t('auth.namePlaceholder');
    els.numberLabel.textContent = t('auth.number');
    els.id.placeholder = t('auth.numberPlaceholder');
    els.submit.textContent = t('auth.submit');
    els.close.setAttribute('aria-label', t('auth.close'));
    els.demo.textContent = '';
    els.demo.hidden = true;
    els.logout.textContent = t('auth.logout');
    if (els.error.dataset.key) els.error.textContent = t(els.error.dataset.key);
    render();
  }

  function showAuthError(key) {
    if (!els) return;
    els.error.dataset.key = key;
    els.error.textContent = t(key);
  }

  function clearAuthError() {
    if (!els) return;
    delete els.error.dataset.key;
    els.error.textContent = '';
  }

  function openLogin() {
    if (!els) return;
    if (session) {
      if (els.menu.hidden) openMenu(); else closeMenu();
      return;
    }
    closeMenu();
    lastFocus = document.activeElement;
    clearAuthError();
    els.form.reset();
    els.overlay.classList.add('is-open');
    els.overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('auth-open');
    notifyShell(true);
    window.setTimeout(() => els.name.focus(), 60);
  }

  function closeLogin() {
    if (!els) return;
    els.overlay.classList.remove('is-open');
    els.overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('auth-open');
    notifyShell(false);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  async function signIn(name, id) {
    const cleanName = String(name || '').trim();
    const cleanId = String(id || '').trim().replace(/\s+/g, '');
    if (!cleanName) return { ok: false, errorKey: 'auth.requiredName' };
    if (!cleanId) return { ok: false, errorKey: 'auth.requiredNumber' };

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, delegate_no: cleanId }),
      });
      const result = await response.json().catch(() => null);
      if (!result?.ok) {
        const invalid = result?.code === 'invalid_credentials' || result?.code === 'invalid_input';
        return { ok: false, errorKey: invalid ? 'auth.invalid' : 'auth.serviceUnavailable' };
      }
      const delegate = result.delegate;
      if (!delegate?.no || !delegate?.name) {
        return { ok: false, errorKey: 'auth.serviceUnavailable' };
      }
      saveSession(
        delegate.name,
        delegate.no,
        delegate.committeeCode || '',
        delegate.committee || '',
      );
      return { ok: true, session: { ...session } };
    } catch (error) {
      console.error('Delegate login failed:', error?.name || 'Error', error?.message || '');
      return { ok: false, errorKey: 'auth.serviceUnavailable' };
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!els) return;
    const name = els.name.value.trim();
    const id = els.id.value.trim().replace(/\s+/g, '');
    if (!name) {
      showAuthError('auth.requiredName');
      els.name.focus();
      return;
    }
    if (!id) {
      showAuthError('auth.requiredNumber');
      els.id.focus();
      return;
    }
    clearAuthError();
    els.submit.disabled = true;
    els.submit.textContent = t('auth.submitting');
    const result = await signIn(name, id);
    els.submit.disabled = false;
    els.submit.textContent = t('auth.submit');
    if (!result.ok) {
      showAuthError(result.errorKey || 'auth.invalid');
      els.id.focus();
      return;
    }
    render();
    closeLogin();
    els.button.focus();
  }

  function signOut() {
    clearSession();
    closeMenu();
    render();
    els.button.focus();
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !els) return;
    const focusable = [...els.panel.querySelectorAll('button, input, [href], select, textarea')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function build() {
    const tools = document.querySelector('.header-tools');
    if (!tools || document.querySelector('.site-auth')) return;

    const language = tools.querySelector('.language-switch');
    let right = tools.querySelector('.header-tools-right');
    if (!right) {
      right = document.createElement('div');
      right.className = 'header-tools-right';
      if (language) {
        language.replaceWith(right);
        right.appendChild(language);
      } else {
        tools.appendChild(right);
      }
    }

    const wrap = document.createElement('div');
    wrap.className = 'site-auth';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'site-auth-btn';
    button.innerHTML = '<span class="auth-dot" aria-hidden="true"></span><span class="auth-label">登录</span>';

    const menu = document.createElement('div');
    menu.className = 'auth-menu';
    menu.hidden = true;
    const menuLabel = document.createElement('span');
    menuLabel.className = 'auth-menu-label';
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.textContent = '退出登录';
    menu.append(menuLabel, logout);

    wrap.append(button, menu);
    right.appendChild(wrap);

    const overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-sub">
        <button class="auth-close" type="button" aria-label="关闭登录窗口">×</button>
        <p class="auth-kicker">SJTUMUNC · DELEGATE ACCESS</p>
        <h2 id="auth-title">代表登录</h2>
        <p class="auth-sub" id="auth-sub">输入姓名和代表编号。登录状态会保存在本机 cookie 中。</p>
        <form class="auth-form" novalidate>
          <div class="auth-field">
            <label for="auth-name">姓名</label>
            <input id="auth-name" name="name" type="text" autocomplete="name" maxlength="40" placeholder="请输入姓名">
          </div>
          <div class="auth-field">
            <label for="auth-id">代表编号</label>
            <input id="auth-id" name="delegateId" type="text" inputmode="numeric" autocomplete="off" maxlength="16" placeholder="例如 0000001">
          </div>
          <p class="auth-error" id="auth-error" role="alert" aria-live="polite"></p>
          <button class="auth-submit" type="submit">登录</button>
        </form>
        <p class="auth-demo"></p>
      </div>`;
    document.body.appendChild(overlay);

    els = {
      button,
      menu,
      menuLabel,
      logout,
      overlay,
      panel: overlay.querySelector('.auth-panel'),
      form: overlay.querySelector('.auth-form'),
      title: overlay.querySelector('#auth-title'),
      sub: overlay.querySelector('#auth-sub'),
      nameLabel: overlay.querySelector('label[for="auth-name"]'),
      numberLabel: overlay.querySelector('label[for="auth-id"]'),
      name: overlay.querySelector('#auth-name'),
      id: overlay.querySelector('#auth-id'),
      error: overlay.querySelector('#auth-error'),
      submit: overlay.querySelector('.auth-submit'),
      close: overlay.querySelector('.auth-close'),
      demo: overlay.querySelector('.auth-demo'),
    };

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (session) {
        if (menu.hidden) openMenu(); else closeMenu();
      } else {
        openLogin();
      }
    });

    logout.addEventListener('click', (event) => {
      event.stopPropagation();
      signOut();
    });

    els.close.addEventListener('click', closeLogin);
    els.form.addEventListener('submit', handleSubmit);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeLogin();
    });

    els.panel.addEventListener('keydown', trapFocus);

    document.addEventListener('click', (event) => {
      if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (els.overlay.classList.contains('is-open')) {
        event.preventDefault();
        closeLogin();
      } else if (!menu.hidden) {
        closeMenu();
        button.focus();
      }
    });

    window.addEventListener('mun-languagechange', applyAuthLanguage);
    applyAuthLanguage();
  }

  function init() {
    session = readSession();
    build();
  }

  window.SJTUMUNC_AUTH = {
    mode: 'cloudbase',
    signIn,
    signOut,
    getSession: () => (session ? { ...session } : null),
    openLogin,
  };

  window.addEventListener('pagehide', () => notifyShell(false), { once: true });

  session = readSession();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
