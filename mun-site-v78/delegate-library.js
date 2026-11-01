(() => {
  const buttons = [...document.querySelectorAll('.delegate-choice')];
  const panels = [...document.querySelectorAll('.delegate-panel')];
  if (!buttons.length) return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const stage=document.querySelector('#academic-procedures');
  const library=document.querySelector('.delegate-library');
  const t = (key, values = {}) => (typeof window.munTranslate === 'function' ? window.munTranslate(key, values) : key);
  const getSession = () => window.SJTUMUNC_AUTH?.getSession?.() || null;
  const normalizeCommittee = (value) => {
    const match = String(value || '').match(/\d+/);
    return match ? match[0].padStart(2, '0') : '';
  };
  const committeeKeys = { '01': 'library.ga2', '02': 'library.ecosoc', '03': 'library.london', '04': 'library.unodc' };
  const committeeLabel = (session) => {
    const code = normalizeCommittee(session?.committeeCode || session?.committee);
    const key = committeeKeys[code];
    return key ? t(key) : (session?.committeeName || (code ? `${code} 会场` : ''));
  };
  const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';

  let authEntry = null;
  let authEntryKicker = null;
  let authEntryTitle = null;
  let authEntryHint = null;
  let authEntryButton = null;

  function createAuthEntry() {
    const heading = library?.querySelector('.delegate-library-heading');
    if (!heading || authEntry) return;
    authEntry = document.createElement('div');
    authEntry.className = 'delegate-auth-entry';
    authEntry.innerHTML = '<div class="delegate-auth-entry-copy"><span class="delegate-auth-entry-kicker">DELEGATE ACCESS</span><strong class="delegate-auth-entry-title"></strong><span class="delegate-auth-entry-hint"></span></div><button class="delegate-auth-entry-button" type="button"></button>';
    heading.insertAdjacentElement('afterend', authEntry);
    authEntryKicker = authEntry.querySelector('.delegate-auth-entry-kicker');
    authEntryTitle = authEntry.querySelector('.delegate-auth-entry-title');
    authEntryHint = authEntry.querySelector('.delegate-auth-entry-hint');
    authEntryButton = authEntry.querySelector('.delegate-auth-entry-button');
    authEntryButton.addEventListener('click', () => {
      if (getSession()) window.SJTUMUNC_AUTH?.signOut?.();
      window.SJTUMUNC_AUTH?.openLogin?.();
    });
  }

  function applyAuthEntry(session) {
    if (!authEntry) return;
    const committee = committeeLabel(session);
    authEntry.dataset.state = session ? 'authed' : 'login';
    authEntryKicker.textContent = session ? t('auth.menuLabel') : 'DELEGATE ACCESS';
    authEntryTitle.textContent = session ? t('auth.welcome', { name: session.name }) : t('auth.title');
    authEntryHint.textContent = session
      ? (committee ? t('library.centralUnlocked', { committee }) : t('library.accessIncomplete'))
      : t('library.accessLogin');
    authEntryButton.textContent = session ? t('library.accessSwitchAction') : t('auth.login');
    authEntryButton.setAttribute('aria-label', session
      ? t('auth.accountAria', { name: session.name })
      : t('auth.loginAria'));
  }

  function ensureAccessNote(panel) {
    let note = panel.querySelector('.delegate-access-note');
    if (note) return note;
    note = document.createElement('div');
    note.className = 'delegate-access-note';
    note.setAttribute('role', 'status');
    note.innerHTML = `<span class="delegate-access-icon" aria-hidden="true">${LOCK_SVG}</span><span class="delegate-access-copy"><strong></strong><small></small></span><button class="delegate-access-action" type="button" hidden></button>`;
    panel.querySelector('.delegate-panel-heading')?.insertAdjacentElement('afterend', note);
    note.querySelector('.delegate-access-action').addEventListener('click', () => {
      if (getSession()) window.SJTUMUNC_AUTH?.signOut?.();
      window.SJTUMUNC_AUTH?.openLogin?.();
    });
    return note;
  }

  function localizeNodes(root) {
    root.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
  }

  function setFileLocked(link, locked) {
    if (!link.dataset.originalHref) link.dataset.originalHref = link.getAttribute('href') || '';
    const meta = link.querySelector('.academic-file-download');
    if (meta && !link.dataset.originalMeta) link.dataset.originalMeta = meta.innerHTML;
    if (!link.dataset.originalText) link.dataset.originalText = link.textContent;

    if (!locked) {
      // Already open: leave the translated labels alone instead of restoring
      // the HTML captured when the page was first painted.
      if (!link.classList.contains('is-locked')) return;
      if (link.dataset.originalHref) link.setAttribute('href', link.dataset.originalHref);
      link.classList.remove('is-locked');
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      link.removeAttribute('aria-label');
      link.removeAttribute('title');
      if (meta) {
        meta.innerHTML = link.dataset.originalMeta;
        localizeNodes(meta);
      } else if (link.dataset.i18n) {
        link.textContent = t(link.dataset.i18n);
      } else {
        link.textContent = link.dataset.originalText;
      }
      link.querySelector('.delegate-file-lock')?.remove();
      return;
    }

    link.classList.add('is-locked');
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('tabindex', '-1');
    link.setAttribute('aria-label', t('library.lockAria'));
    link.setAttribute('title', t('library.lockAria'));
    if (meta) meta.textContent = t('library.locked');
    else link.textContent = t('library.flowLocked');
    link.querySelector('.delegate-file-lock')?.remove();
    const lock = document.createElement('span');
    lock.className = 'delegate-file-lock';
    lock.setAttribute('aria-hidden', 'true');
    lock.innerHTML = LOCK_SVG;
    link.append(lock);
  }

  function applyAccess() {
    const session = getSession();
    createAuthEntry();
    applyAuthEntry(session);
    const ownCommittee = normalizeCommittee(session?.committee);
    buttons.forEach((button) => {
      const isOwn = Boolean(session && ownCommittee && normalizeCommittee(button.dataset.committee) === ownCommittee);
      button.classList.toggle('is-own-committee', isOwn);
      if (isOwn) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    for (const panel of panels) {
      const panelCommittee = normalizeCommittee(panel.dataset.committee);
      const state = !session ? 'login' : (!ownCommittee ? 'incomplete' : (ownCommittee === panelCommittee ? 'ok' : 'other'));
      const note = ensureAccessNote(panel);
      const title = note.querySelector('.delegate-access-copy strong');
      const hint = note.querySelector('.delegate-access-copy small');
      const action = note.querySelector('.delegate-access-action');
      note.hidden = state === 'ok';
      note.dataset.state = state;
      if (state === 'login') {
        title.textContent = t('library.accessLogin');
        hint.textContent = t('library.accessLoginHint');
        action.hidden = false;
        action.textContent = t('library.accessLoginAction');
      } else if (state === 'other') {
        title.textContent = t('library.accessOther', { committee: committeeLabel(session) });
        hint.textContent = '';
        action.hidden = false;
        action.textContent = t('library.accessSwitchAction');
      } else if (state === 'incomplete') {
        title.textContent = t('library.accessIncomplete');
        hint.textContent = '';
        action.hidden = false;
        action.textContent = t('library.accessSwitchAction');
      }
      panel.querySelectorAll('.academic-download, .procedure-files a[download]').forEach((link) => {
        setFileLocked(link, state !== 'ok');
        if (!link.dataset.lockBound) {
          link.dataset.lockBound = 'true';
          link.addEventListener('click', (event) => {
            if (link.classList.contains('is-locked')) event.preventDefault();
          });
        }
      });
    }

    // A successful login expands the panel that matches the delegate's
    // committee. Do not scroll away from the sign-in guide automatically.
    const sessionKey = session ? `${session.id}:${ownCommittee}` : '';
    if (session && ownCommittee && autoOpenedFor !== sessionKey) {
      const ownButton = buttons.find((button) => normalizeCommittee(button.dataset.committee) === ownCommittee);
      if (ownButton) {
        autoOpenedFor = sessionKey;
        if (ownButton.getAttribute('aria-expanded') !== 'true') {
          autoOpening = true;
          ownButton.click();
          autoOpening = false;
        }
      }
    } else if (!session) {
      autoOpenedFor = null;
    }
  }

  window.addEventListener('sjtumunc:authchange', applyAccess);
  window.addEventListener('mun-languagechange', applyAccess);

  let selected = null;
  let autoOpening = false;
  let autoOpenedFor = null;
  const close = () => {
    panels.forEach(p => { p.getAnimations().forEach(a=>a.cancel()); p.hidden = true; });
    buttons.forEach(b => b.setAttribute('aria-expanded','false'));
    stage.getAnimations().forEach(a=>a.cancel());
    library.removeAttribute('data-active-committee');
    selected = null;
  };
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('aria-controls');
      const wasOpen = selected === id;
      const oldHeight=stage.getBoundingClientRect().height;
      close();
      if (wasOpen) return;
      const panel = document.getElementById(id);
      selected = id;
      panel.hidden = false;
      button.setAttribute('aria-expanded','true');
      library.dataset.activeCommittee=button.dataset.committee;
      if (!reduced.matches) {
        const height=stage.getBoundingClientRect().height;
        stage.animate([{height:oldHeight+'px'},{height:height+'px'}],{duration:480,easing:'cubic-bezier(.2,.8,.2,1)'});
        panel.animate([{opacity:.3,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,easing:'cubic-bezier(.2,.8,.2,1)'});
        panel.querySelectorAll('.academic-download').forEach((file,i)=>file.animate([{opacity:.45,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,delay:45*i,easing:'cubic-bezier(.2,.8,.2,1)'}));
      }
      if(!autoOpening && panel.getBoundingClientRect().top>innerHeight*.8)panel.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
    });
    button.addEventListener('keydown', event => {
      const direction = {ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];
      if (direction) { event.preventDefault(); buttons[(index+direction+buttons.length)%buttons.length].focus(); }
    });
  });
  panels.forEach(panel=>panel.querySelector('.delegate-panel-close').addEventListener('click',()=>{
    const button=buttons.find(b=>b.getAttribute('aria-controls')===selected);
    close();
    button?.focus({preventScroll:true});
  }));
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||!selected)return;
    const button=buttons.find(b=>b.getAttribute('aria-controls')===selected);
    close();button?.focus({preventScroll:true});
  });
  applyAccess();
})();
