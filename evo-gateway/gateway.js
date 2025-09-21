// gateway.js - main.gangnam555.com 게이트웨이(리다이렉트 전용, DB 없음)
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
app.use(cookieParser());

// 환경변수/기본값
const NODES = (process.env.NODES || 'evo01.gangnam555.com,evo02.gangnam555.com,evo03.gangnam555.com')
  .split(',').map(s => s.trim()).filter(Boolean);
const HEALTH_PATH = process.env.HEALTH_PATH || '/health';
const HEALTH_INTERVAL_MS = parseInt(process.env.HEALTH_INTERVAL_MS || '15000', 10);
const COOKIE_NAME = process.env.COOKIE_NAME || 'assigned';
const COOKIE_MAX_AGE = parseInt(process.env.COOKIE_MAX_AGE || String(1000*60*60*24*30), 10);
const REQUIRE_HTTPS = String(process.env.REQUIRE_HTTPS || 'true').toLowerCase() === 'true';
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'Lax';
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || (REQUIRE_HTTPS ? 'true' : 'false')).toLowerCase() === 'true';
const PORT = parseInt(process.env.PORT || '3000', 10);

// http→https 강제(프록시 뒤 인식용)
if (REQUIRE_HTTPS) {
  app.set('trust proxy', true); // X-Forwarded-Proto 신뢰 필요  [oai_citation:1‡Microsoft Learn](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows?utm_source=chatgpt.com)
  app.use((req, res, next) => {
    const https = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (https) return next();
    res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
  });
}

let healthy = new Set(NODES);
async function refreshHealth() {
  const results = await Promise.allSettled(NODES.map(async host => {
    const url = `https://${host}${HEALTH_PATH}`;
    const r = await fetch(url);
    if (r.ok) return host;
    throw new Error(host);
  }));
  const next = new Set();
  results.forEach(r => { if (r.status === 'fulfilled') next.add(r.value); });
  healthy = next.size ? next : new Set(NODES);
  console.log('[health ok]', [...healthy].join(',') || '(none)');
}
setInterval(() => refreshHealth().catch(()=>{}), HEALTH_INTERVAL_MS);
refreshHealth().catch(()=>{});

function pickNode(key) {
  const h = crypto.createHash('md5').update(String(key)).digest();
  for (let i=0; i<h.length; i++) {
    const idx = h[i] % NODES.length;
    const cand = NODES[idx];
    if (healthy.has(cand)) return cand;
  }
  return NODES[0];
}

app.get('/debugEntry', (req, res) => {
  const qs = req.originalUrl.includes('?') ? ('?' + req.originalUrl.split('?')[1]) : '';
  const assigned = req.cookies?.[COOKIE_NAME];
  let target = (assigned && healthy.has(assigned)) ? assigned : null;

  if (!target) {
    const key = req.query.username || req.cookies?.uid || req.ip;
    target = pickNode(key);
  }

  res.cookie(COOKIE_NAME, target, {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE,   // None이면 Secure 필수
    secure: COOKIE_SECURE,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  res.redirect(302, `https://${target}/debugEntry${qs}`);
});

app.get('/status', (req, res) => res.json({ healthy: [...healthy] }));

app.listen(PORT, '0.0.0.0', () => console.log(`[gateway] :${PORT}`));