/* Seat allocation query — backend only.
 *
 * The frontend never contains a seat roster. After sign-in it sends the
 * session's name + delegate number to `delegates_api` (action: "seat"), which
 * returns only the matching delegate's published seat.
 */
(() => {
  'use strict';

  const form = document.getElementById('seat-query-form');
  if (!form) return;

  const nameInput = document.getElementById('seat-name');
  const noInput = document.getElementById('seat-number');
  const notice = document.getElementById('seat-notice');
  const result = document.getElementById('seat-result');
  const submit = form.querySelector('.seat-submit');
  const gate = document.getElementById('seat-auth-gate');
  const gateLogin = gate?.querySelector('[data-seat-login]');

  const write = (key) => (window.munTranslate ? window.munTranslate(key) : key);
  const committeeKeys = { '01': 'library.ga2', '02': 'library.ecosoc', '03': 'library.london', '04': 'library.unodc' };
  const committeeLabel = (row) => {
    const match = String(row?.committeeCode || '').match(/\d+/);
    const key = match ? committeeKeys[match[0].padStart(2, '0')] : '';
    return key ? write(key) : (row?.committee || '');
  };

  let busy = false;
  let lastSeat = null;

  const clearNotice = () => {
    notice.textContent = '';
    notice.className = 'seat-notice';
    delete notice.dataset.key;
    form.classList.remove('is-error');
  };

  const showNotice = (key) => {
    notice.dataset.key = key;
    notice.textContent = write(key);
    notice.className = 'seat-notice show';
    form.classList.remove('is-error');
    void form.offsetWidth;
    form.classList.add('is-error');
    result.dataset.state = 'idle';
  };

  const reveal = (row) => {
    lastSeat = row;
    document.getElementById('seat-result-name').textContent = row.name;
    document.getElementById('seat-result-no').textContent = row.no;
    document.getElementById('seat-result-committee').textContent = committeeLabel(row);
    document.getElementById('seat-result-seat').textContent = row.seat;

    const role = document.getElementById('seat-result-role');
    role.textContent = row.seatRole || '';
    role.hidden = !row.seatRole;

    const schoolRow = document.getElementById('seat-result-school-row');
    document.getElementById('seat-result-school').textContent = row.school || '';
    schoolRow.hidden = !row.school;

    const payment = document.getElementById('seat-result-payment');
    const paymentKey = row.paymentKey === 'paid' || row.paymentKey === 'unpaid'
      ? row.paymentKey
      : 'pending';
    payment.className = `seat-payment-badge is-${paymentKey}`;
    payment.textContent = write(`seat.payment${paymentKey[0].toUpperCase()}${paymentKey.slice(1)}`);

    // Restart the reveal animation even when the same record is queried again.
    result.dataset.state = 'idle';
    void result.offsetWidth;
    result.dataset.state = 'revealed';
  };

  const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });

  const requestSeat = async (session) => {
    const response = await withTimeout(fetch('/api/seat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: session.name,
        delegate_no: session.id,
      }),
    }), 20000);
    const payload = await response.json().catch(() => null);
    if (!payload?.ok) {
      const error = new Error(payload?.code || 'service_unavailable');
      error.code = payload?.code || 'service_unavailable';
      throw error;
    }
    if (!payload.seat?.no || !payload.seat?.name || !payload.seat?.seat) {
      throw new Error('service_unavailable');
    }
    return payload.seat;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const session = window.SJTUMUNC_AUTH?.getSession?.() || null;
    if (!session) {
      showNotice('seat.loginRequired');
      return;
    }

    clearNotice();
    busy = true;
    submit.disabled = true;
    submit.dataset.loading = 'true';
    submit.setAttribute('aria-busy', 'true');

    try {
      const row = await requestSeat(session);
      reveal(row);
    } catch (error) {
      const code = error?.code || error?.message;
      if (code === 'not_published') {
        showNotice('seat.notPublished');
      } else if (code === 'invalid_credentials' || code === 'invalid_input') {
        showNotice('seat.notFound');
      } else {
        showNotice('seat.serviceUnavailable');
      }
    } finally {
      busy = false;
      submit.disabled = false;
      delete submit.dataset.loading;
      submit.removeAttribute('aria-busy');
    }
  });

  [nameInput, noInput].forEach((input) => {
    input.addEventListener('input', () => {
      if (notice.classList.contains('show')) clearNotice();
    });
  });

  const getSession = () => window.SJTUMUNC_AUTH?.getSession?.() || null;

  function syncAuth() {
    const session = getSession();
    const authed = Boolean(session);
    form.classList.toggle('is-locked', !authed);
    if (gate) gate.hidden = authed;
    nameInput.disabled = !authed;
    noInput.disabled = !authed;
    nameInput.readOnly = authed;
    noInput.readOnly = authed;
    if (authed) {
      nameInput.value = session.name;
      noInput.value = session.id;
    } else {
      nameInput.value = '';
      noInput.value = '';
      clearNotice();
      result.dataset.state = 'idle';
    }
    if (!busy) submit.disabled = !authed;
  }

  gateLogin?.addEventListener('click', () => {
    window.SJTUMUNC_AUTH?.openLogin?.();
  });
  window.addEventListener('sjtumunc:authchange', syncAuth);
  syncAuth();

  // Keep a visible notice and an already revealed seat card in the current language.
  window.addEventListener('mun-languagechange', () => {
    if (lastSeat && result.dataset.state === 'revealed') reveal(lastSeat);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-set-language]')) return;
    if (notice.classList.contains('show') && notice.dataset.key) {
      notice.textContent = write(notice.dataset.key);
    }
  });

  // Pointer-tracked highlight on both cards.
  document.querySelectorAll('.seat-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  });
})();
