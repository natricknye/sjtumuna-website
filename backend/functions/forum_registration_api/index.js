'use strict';

const http = require('node:http');
const PORT = process.env.PORT || 9000;
const ENV_ID = process.env.CLOUDBASE_ENV_ID;
const API_KEY = process.env.CLOUDBASE_APIKEY || process.env.CLOUDBASE_API_KEY;
const roles = {
  member: ['club_leader', 'conference_leader', 'conference_delegate'],
  observer: ['other_region_leader', 'other_region_delegate', 'shanghai_university_leader'],
};

function reply(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= 16384) chunks.push(chunk);
    });
    req.on('end', () => resolve(size > 16384 ? null : Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const text = (value) => typeof value === 'string' ? value.trim() : '';

const server = http.createServer(async (req, res) => {
  // 允许公开网页提交报名；这里不提供报名名单查询。
  // CloudBase HTTP gateway owns CORS; duplicated headers block browser submissions.
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  if (req.method === 'GET') {
    return reply(res, 200, { ok: true, message: '论坛报名接口已启动' });
  }
  if (req.method !== 'POST') {
    return reply(res, 405, { ok: false, code: 'method_not_allowed' });
  }

  try {
    const body = await readBody(req);
    if (body === null) {
      return reply(res, 413, { ok: false, code: 'input_too_large' });
    }
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      return reply(res, 400, { ok: false, code: 'invalid_json' });
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return reply(res, 400, { ok: false, code: 'invalid_input' });
    }

    const kind = text(input.kind);
    const role = text(kind === 'member' ? input.member_role : input.observer_role);
    const name = text(input.name);
    const school = text(input.school);
    const delegateId = text(input.delegate_id);
    // 只检查填写是否完整，不查询或核验代表身份。
    if (!Object.hasOwn(roles, kind) || !roles[kind].includes(role) ||
        !name || name.length > 80 || !school || school.length > 200 ||
        delegateId.length > 80 || (role !== 'club_leader' && !delegateId)) {
      return reply(res, 400, { ok: false, code: 'invalid_input', message: '请完整填写报名信息' });
    }
    if (!ENV_ID || !API_KEY) {
      return reply(res, 500, { ok: false, code: 'server_not_configured' });
    }

    const record = {
      kind,
      member_role: kind === 'member' ? role : null,
      observer_role: kind === 'observer' ? role : null,
      name,
      school,
      delegate_id: role === 'club_leader' ? null : delegateId,
    };
    const response = await fetch(
      `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest/forum_registrations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(7000),
      },
    );
    if (!response.ok) {
      console.error('Forum database write failed, HTTP status:', response.status);
      return reply(res, 502, { ok: false, code: 'database_error' });
    }
    return reply(res, 201, { ok: true, message: '报名成功' });
  } catch (error) {
    console.error('Forum request failed:', error.name);
    return reply(res, 503, { ok: false, code: 'service_unavailable' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Forum registration server listening on port ${PORT}`);
});
