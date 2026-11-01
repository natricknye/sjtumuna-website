/* Astra easter egg.
 * The inline entry sits at the bottom of the notice page and fades in after
 * one second. A signed-in delegate who has entered Astra keeps the nav entry
 * on every page for 30 days; signing out hides it again.
 */
(() => {
  'use strict';

  const AUTH_COOKIE = 'sjtumunc_delegate';
  const ASTRA_COOKIE = 'sjtumunc_astra';
  const ASTRA_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

  function readCookie(name) {
    const prefix = name + '=';
    const parts = document.cookie ? document.cookie.split(';') : [];
    for (const part of parts) {
      const value = part.trim();
      if (value.startsWith(prefix)) return value.slice(prefix.length);
    }
    return '';
  }

  function writeCookie(name, value, maxAge) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  }

  function hasDelegateSession() {
    const raw = readCookie(AUTH_COOKIE);
    if (!raw) return false;
    try {
      const session = JSON.parse(decodeURIComponent(raw));
      return Boolean(session && session.exp > Date.now());
    } catch {
      return false;
    }
  }

  function isAstraPage() {
    return document.body.classList.contains('astra-page') || /(^|\/)astra\.html$/.test(location.pathname);
  }

  const GUIDE_LABELS = [
    ['about.html', 'URANUS'],
    ['forum.html', 'NEPTUNUS'],
    ['notice.html', 'PLUTO'],
    ['astra.html', 'Astra'],
  ];

  function guideLabelFor(link) {
    const href = (link.getAttribute('href') || '').split(/[?#]/)[0];
    const match = GUIDE_LABELS.find(([file]) => href.endsWith(file));
    return match ? match[1] : '';
  }

  function guideNode(label) {
    const node = document.createElement('span');
    node.className = 'nav-guide-label';
    node.setAttribute('aria-hidden', 'true');
    node.textContent = label;
    return node;
  }

  function decorateNav(nav) {
    if (nav.dataset.astraGuides === '1') return;
    const links = [...nav.children].filter((node) => node.matches('a'));
    if (links.length < 4) return;

    const group = document.createElement('span');
    group.className = 'nav-earth-group';
    const firstThree = links.slice(0, 3);
    firstThree.forEach((link) => group.append(link));
    const earthGuide = document.createElement('span');
    earthGuide.className = 'nav-earth-guide';
    earthGuide.setAttribute('aria-hidden', 'true');
    const line = document.createElement('span');
    line.className = 'nav-earth-line';
    earthGuide.append(line, guideNode('Terra'));
    group.append(earthGuide);

    const rebuilt = [group];
    links.slice(3).forEach((link) => {
      const item = document.createElement('span');
      item.className = 'nav-guide-item';
      const label = guideLabelFor(link);
      item.append(link);
      if (label) item.append(guideNode(label));
      rebuilt.push(item);
    });

    nav.replaceChildren(...rebuilt);
    nav.dataset.astraGuides = '1';
    document.body.classList.add('astra-guides');
  }

  function undecorateNav(nav) {
    if (nav.dataset.astraGuides !== '1') return;
    const restored = [];
    [...nav.children].forEach((child) => {
      if (child.matches('.nav-earth-group')) {
        child.querySelectorAll(':scope > a').forEach((link) => restored.push(link));
      } else if (child.matches('.nav-guide-item')) {
        const link = child.querySelector(':scope > a');
        if (link) restored.push(link);
      } else if (child.matches('a')) {
        restored.push(child);
      }
    });
    nav.replaceChildren(...restored);
    delete nav.dataset.astraGuides;
    document.body.classList.remove('astra-guides');
  }

  function syncAstraNav() {
    if (isAstraPage()) {
      if (hasDelegateSession()) writeCookie(ASTRA_COOKIE, '1', ASTRA_COOKIE_MAX_AGE);
      return;
    }
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    const existing = nav.querySelector('a.astra-link');
    if (!hasDelegateSession() || readCookie(ASTRA_COOKIE) !== '1') {
      undecorateNav(nav);
      existing?.remove();
      return;
    }
    if (!existing) {
      const link = document.createElement('a');
      link.href = 'astra.html';
      link.className = 'astra-link';
      link.textContent = 'Astra';
      nav.append(link);
    }
    decorateNav(nav);
  }

  syncAstraNav();
  window.addEventListener('sjtumunc:authchange', syncAstraNav);

  // Hide the host wordmark while the star-map About panel is open.
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== 'astra-about-open') return;
    document.body.classList.toggle('astra-about-open', Boolean(event.data.open));
  });

  // Keep the new Astra nav entry in view when the mobile nav overflows.
  const activeAstra = document.querySelector('.site-nav a.astra-link.active');
  if (activeAstra) {
    const nav = activeAstra.closest('.site-nav');
    if (nav) {
      window.requestAnimationFrame(() => {
        if (nav.scrollWidth <= nav.clientWidth) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        nav.scrollTo({ left: nav.scrollWidth, behavior: reduce ? 'auto' : 'smooth' });
      });
    }
  }

  const teaser = document.getElementById('astra-teaser');
  if (!teaser) return;

  const reveal = () => {
    teaser.classList.add('is-visible');
    teaser.setAttribute('aria-hidden', 'false');
  };

  let timer = 0;
  const footer = document.querySelector('.site-footer');

  if (footer && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible) {
        if (timer || teaser.classList.contains('is-visible')) return;
        timer = window.setTimeout(() => {
          timer = 0;
          reveal();
          io.disconnect();
        }, 1000);
      } else if (timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
    }, { threshold: 0.08 });
    io.observe(footer);
  } else {
    const check = () => {
      if (teaser.classList.contains('is-visible')) return;
      const rect = footer ? footer.getBoundingClientRect() : null;
      const visible = Boolean(rect && rect.top < window.innerHeight && rect.bottom > 0);
      if (visible && !timer) {
        timer = window.setTimeout(() => { timer = 0; reveal(); }, 1000);
      } else if (!visible && timer) {
        window.clearTimeout(timer);
        timer = 0;
      }
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
  }
})();
