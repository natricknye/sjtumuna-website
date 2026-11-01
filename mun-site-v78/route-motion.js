(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'mun-orbit-arrival';
  let arrival = null;
  try {
    sessionStorage.removeItem('mun-route-arrival');
    const stored = JSON.parse(sessionStorage.getItem(key) || 'null');
    sessionStorage.removeItem(key);
    if (stored && stored.to === location.pathname && Date.now() - stored.at < 20000 && !reduced.matches) {
      arrival = stored;
      root.classList.add('orbit-arrival-pending');
      setTimeout(() => root.classList.remove('orbit-arrival-pending'), 1600);
    }
  } catch {}
  const setup = () => {
    let leaving = false;
    const overlay = (image, background,kind='earth') => {
      const layer = document.createElement('div');
      layer.className = 'route-orbit';
      layer.dataset.body=kind;
      layer.setAttribute('aria-hidden', 'true');
      layer.style.setProperty('--orbit-background', background || '#f5ece6');
      const backdrop = document.createElement('div');
      backdrop.className = 'route-orbit-backdrop';
      const ball = document.createElement('div');
      ball.className = 'route-orbit-ball';
      ball.style.setProperty('--route-size',({uranus:425,neptune:383,pluto:267,earth:267,galaxy:420}[kind]||267)+'px');
      const globe = document.createElement('img');
      globe.src = image || 'assets/route-globe.svg';
      globe.alt = '';
      ball.append(globe);
      layer.append(backdrop, ball);
      document.body.append(layer);
      return { layer, ball, backdrop };
    };
    if (arrival) {
      const { layer } = overlay(arrival.image, arrival.background,arrival.kind);
      document.body.classList.add('orbit-revealing');
      layer.classList.add('is-arriving');
      root.classList.remove('orbit-arrival-pending');
      setTimeout(() => {
        layer.remove();
        document.body.classList.remove('orbit-revealing');
      }, 650);
    }
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || reduced.matches || event.defaultPrevented || event.button !== 0 ||
          event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
          link.hasAttribute('download') || link.target) return;
      const destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin ||
          !(/\.html$/.test(destination.pathname) || destination.pathname.endsWith('/')) ||
          (destination.pathname === location.pathname && destination.search === location.search)) return;
      // Home keeps its original school/conference opening sequence.
      if (destination.pathname.endsWith('/index.html') || destination.pathname.endsWith('/')) return;
      if (leaving) { event.preventDefault(); return; }
      if (!Element.prototype.animate) return;
      event.preventDefault();
      leaving = true;
      let image = null;
      let source = {left:innerWidth/2-130,top:innerHeight/2-130,width:260,height:260};
      let visibleGlobe = false;
      const leavingAstra = document.body.classList.contains('astra-page') || /(^|\/)astra\.html$/.test(location.pathname);
      const canvas = leavingAstra ? null : document.querySelector('#page-planet,#conference-globe,#xuhui-map-canvas');
      const kind = leavingAstra ? 'galaxy' : (document.querySelector('.planet-scene')?.dataset.planet||'earth');
      if (leavingAstra) image = 'assets/route-galaxy.webp';
      try {
        if (canvas) {
          if(canvas.captureTransition)image=canvas.captureTransition();
          else{const shot=document.createElement('canvas');shot.width=shot.height=Math.min(1024,canvas.width);shot.getContext('2d').drawImage(canvas,0,0,shot.width,shot.height);image=shot.toDataURL('image/png');}
          const box = canvas.getBoundingClientRect();
          const overlap=Math.max(0,Math.min(box.bottom,innerHeight)-Math.max(box.top,0));
          visibleGlobe = box.width>0&&overlap>box.height*.35;
          if (visibleGlobe) source = box;
        }
      } catch {}
      if(!image&&kind!=='earth'){if(!window.munNavigateWithMusic?.(destination.href))location.assign(destination.href);return;}
      const background = getComputedStyle(document.body).getPropertyValue('--fx-surface').trim() || '#f5ece6';
      const { layer, ball, backdrop } = overlay(image, background,kind);
      const diameter = ball.getBoundingClientRect().width;
      const x = source.left + source.width / 2 - innerWidth / 2;
      const y = source.top + source.height / 2 - innerHeight / 2;
      const scale = visibleGlobe ? Math.min(source.width, source.height) / diameter : .18;
      if (visibleGlobe) canvas.parentElement.style.opacity = '0';
      document.body.classList.add('orbit-departing');
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'forwards' });
      ball.querySelector('img').animate([
        { transform: 'rotate(0deg)' }, { transform: 'rotate(18deg)' },
      ], { duration: 390, easing: 'cubic-bezier(.22,.68,.2,1)', fill: 'forwards' });
      const flight = ball.animate([
        { transform: `translate3d(${x}px,${y}px,0) scale(${scale})`, opacity: visibleGlobe ? 1 : .25 },
        { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)', opacity: 1 },
      ], { duration: 390, easing: 'cubic-bezier(.22,.68,.2,1)', fill: 'forwards' });
      try {
        sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), to: destination.pathname, image, background,kind }));
      } catch {}
      let navigated = false;
      const navigate = () => {
        if (navigated) return;
        navigated = true;
        if(!window.munNavigateWithMusic?.(destination.href))location.assign(destination.href);
      };
      flight.finished.then(navigate, navigate);
      setTimeout(navigate, 480);
      window.addEventListener('pageshow', () => {
        layer.remove(); leaving = false;
        document.body.classList.remove('orbit-departing');
        if (canvas) canvas.parentElement.style.removeProperty('opacity');
      }, { once: true });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
