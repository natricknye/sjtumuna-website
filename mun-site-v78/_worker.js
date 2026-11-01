// Cloudflare Pages Function for the delegate portal.
//
// The browser only talks to these same-origin endpoints. The CloudBase service
// key is a Pages secret and is never shipped to the browser. Both routes are
// read-only and return at most one record.

const ENV_ID = 'YOUR_CLOUDBASE_ENV_ID';
const DB_URL = `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest/delegates`;
const COMMITTEE_NAMES = {
  1: '联合国大会第二委员会（经济和金融委员会）',
  2: '联合国经济及社会理事会（ECOSOC）',
  3: '1912年伦敦会议',
  4: '联合国毒品和犯罪问题办公室（UNODC）',
  5: '第五会场',
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  },
});

const text = (value, maxLength) => {
  if (typeof value !== 'string') return '';
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : '';
};

const committeeCode = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? String(number).padStart(2, '0') : '';
};

const committeeName = (value) => COMMITTEE_NAMES[Number(value)] || '会场';

const paymentInfo = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (/已缴|paid/i.test(raw)) return { key: 'paid', label: raw };
  if (/未缴|unpaid/i.test(raw)) return { key: 'unpaid', label: raw };
  return { key: 'pending', label: raw };
};

const delegateSummary = (record) => ({
  no: record.delegate_no,
  name: record.name,
  committee: committeeName(record.venue_preference),
  committeeCode: committeeCode(record.venue_preference),
});

async function lookup(env, { name, delegateNo, select }) {
  const apiKey = env.CLOUDBASE_API_KEY;
  if (!apiKey) throw new Error('server_not_configured');

  const url = new URL(DB_URL);
  url.search = new URLSearchParams({
    select,
    delegate_no: `eq.${delegateNo}`,
    name: `eq.${name}`,
    limit: '1',
  }).toString();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error('database_error');
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function readJson(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 8192) return null;
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

async function login(request, env) {
  const input = await readJson(request);
  if (!input) return json({ ok: false, code: 'invalid_input' }, 400);

  const name = text(input.name, 80);
  const delegateNo = text(input.delegate_no, 40).toUpperCase();
  if (!name || !delegateNo) return json({ ok: false, code: 'invalid_input' }, 400);

  try {
    const rows = await lookup(env, {
      name,
      delegateNo,
      select: 'delegate_no,name,venue_preference',
    });
    if (rows.length !== 1) return json({ ok: false, code: 'invalid_credentials' });
    return json({
      ok: true,
      code: 'matched',
      delegate: delegateSummary(rows[0]),
    });
  } catch (error) {
    if (error.message === 'server_not_configured') {
      return json({ ok: false, code: 'server_not_configured' }, 503);
    }
    console.error('Delegate login lookup failed:', error.message);
    return json({ ok: false, code: 'database_unavailable' }, 503);
  }
}

async function seat(request, env) {
  const input = await readJson(request);
  if (!input) return json({ ok: false, code: 'invalid_input' }, 400);

  const name = text(input.name, 80);
  const delegateNo = text(input.delegate_no, 40).toUpperCase();
  if (!name || !delegateNo) return json({ ok: false, code: 'invalid_input' }, 400);

  try {
    const rows = await lookup(env, {
      name,
      delegateNo,
      select: 'delegate_no,name,venue_preference,assigned_seat,seat_role,school,payment_status,result_published',
    });
    if (rows.length !== 1) return json({ ok: false, code: 'invalid_credentials' });

    const record = rows[0];
    const assignedSeat = typeof record.assigned_seat === 'string' ? record.assigned_seat.trim() : '';
    if (!record.result_published || !assignedSeat) {
      return json({ ok: false, code: 'not_published' });
    }

    const payment = paymentInfo(record.payment_status);
    return json({
      ok: true,
      code: 'matched',
      seat: {
        ...delegateSummary(record),
        seat: assignedSeat,
        seatRole: typeof record.seat_role === 'string' ? record.seat_role.trim() : '',
        school: typeof record.school === 'string' ? record.school.trim() : '',
        paymentKey: payment.key,
        paymentLabel: payment.label,
      },
    });
  } catch (error) {
    if (error.message === 'server_not_configured') {
      return json({ ok: false, code: 'server_not_configured' }, 503);
    }
    console.error('Delegate seat lookup failed:', error.message);
    return json({ ok: false, code: 'database_unavailable' }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/login' || url.pathname === '/api/seat') {
      if (request.method !== 'POST') {
        return json({ ok: false, code: 'method_not_allowed' }, 405);
      }
      return url.pathname === '/api/login'
        ? login(request, env)
        : seat(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
