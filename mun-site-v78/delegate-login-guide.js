/* Large delegate sign-in guide on the representative page. */
(() => {
  'use strict';

  const guide = document.getElementById('delegate-login-guide');
  const button = document.getElementById('delegate-login-guide-button');
  if (!guide || !button) return;

  const kicker = guide.querySelector('.delegate-login-guide-copy .eyebrow');
  const body = guide.querySelector('.delegate-login-guide-body');
  const note = guide.querySelector('.delegate-login-guide-note');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const t = (key, values = {}) => (typeof window.munTranslate === 'function' ? window.munTranslate(key, values) : key);
  const getSession = () => window.SJTUMUNC_AUTH?.getSession?.() || null;
  const committeeKeys = { '01': 'library.ga2', '02': 'library.ecosoc', '03': 'library.london', '04': 'library.unodc' };
  const committeeLabel = (session) => {
    const match = String(session?.committeeCode || session?.committee || '').match(/\d+/);
    const key = match ? committeeKeys[match[0].padStart(2, '0')] : '';
    return key ? t(key) : (session?.committeeName || '');
  };

  function render() {
    const session = getSession();
    guide.dataset.state = session ? 'authed' : 'login';

    if (session) {
      const committee = committeeLabel(session);
      if (kicker) kicker.textContent = t('login.guideSignedInKicker');
      body.textContent = t('login.guideWelcome', { name: session.name, id: session.id });
      note.textContent = committee
        ? t('login.guideCommittee', { committee })
        : t('login.guideNote');
      button.textContent = t('login.guideViewSeat');
      button.dataset.mode = 'seat';
    } else {
      if (kicker) kicker.textContent = t('login.guideKicker');
      body.textContent = t('login.guideBody');
      note.textContent = t('login.guideNote');
      button.textContent = t('login.guideAction');
      button.dataset.mode = 'login';
    }
  }

  button.addEventListener('click', () => {
    if (getSession()) {
      document.getElementById('seat-allocation')?.scrollIntoView({
        behavior: reduced.matches ? 'instant' : 'smooth',
        block: 'start',
      });
      return;
    }
    window.SJTUMUNC_AUTH?.openLogin?.();
  });

  window.addEventListener('sjtumunc:authchange', render);
  window.addEventListener('mun-languagechange', render);
  render();
})();
