(() => {
  'use strict';
  // Calendar-day countdown; no opening hour has been announced.
  const start = Date.parse('2026-10-30T00:00:00+08:00');
  const end = Date.parse('2026-11-02T00:00:00+08:00');
  const number = document.querySelector('#countdown-days');
  if (!number) return;
  const label = document.querySelector('#countdown-label');
  const unit = document.querySelector('#countdown-unit');
  window.munCountdownState = (now = Date.now()) => ({
    days: Math.max(0, Math.ceil((start - now) / 86400000)),
    phase: now < start ? 'upcoming' : now < end ? 'live' : 'ended',
  });
  window.munUpdateCountdown = () => {
    const { days, phase } = window.munCountdownState();
    const value = String(days).padStart(2, '0');
    if (number.textContent !== value) number.textContent = value;
    const labelKey = phase === 'upcoming' ? 'home.countdownLabel'
      : phase === 'live' ? 'home.countdownLive' : 'home.countdownEnded';
    label.dataset.i18n = labelKey;
    label.textContent = window.munTranslate(labelKey);
    unit.hidden = phase !== 'upcoming';
    number.hidden = phase !== 'upcoming';
    document.querySelector('.conference-countdown').dataset.phase = phase;
  };
  window.munUpdateCountdown();
  window.setInterval(() => { if (!document.hidden) window.munUpdateCountdown(); }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) window.munUpdateCountdown();
  });
})();
