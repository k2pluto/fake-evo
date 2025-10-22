// gateway.js - main.gangnam555.com 게이트웨이(리다이렉트 전용, DB 없음)
const express = require('express');

const app = express();

// 환경변수/기본값
const NODES = (process.env.NODES || 'evo01.gangnam555.com,evo02.gangnam555.com,evo03.gangnam555.com')
  .split(',').map(s => s.trim()).filter(Boolean);
const HEALTH_PATH = process.env.HEALTH_PATH || '/health';
const HEALTH_INTERVAL_MS = parseInt(process.env.HEALTH_INTERVAL_MS || '15000', 10);
const REQUIRE_HTTPS = String(process.env.REQUIRE_HTTPS || 'true').toLowerCase() === 'true';
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
let roundRobinIndex = 0;

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

// Round Robin으로 노드 선택 (완전 균등 분산)
function pickNode() {
  const healthyArray = Array.from(healthy);
  if (healthyArray.length === 0) return NODES[0];

  const node = healthyArray[roundRobinIndex % healthyArray.length];
  roundRobinIndex++;
  return node;
}

// 개발용: /debugEntry
app.get('/debugEntry', (req, res) => {
  const qs = req.originalUrl.includes('?') ? ('?' + req.originalUrl.split('?')[1]) : '';

  // 매번 Round Robin으로 균등 분산 (쿠키 사용 안 함)
  const target = pickNode();

  console.log(`[debugEntry] -> ${target}`);
  res.redirect(302, `https://${target}/debugEntry${qs}`);
});

// 운영용: /entry
app.get('/entry', (req, res) => {
  const qs = req.originalUrl.includes('?') ? ('?' + req.originalUrl.split('?')[1]) : '';

  // 매번 Round Robin으로 균등 분산 (쿠키 사용 안 함)
  const target = pickNode();

  console.log(`[entry] -> ${target}`);
  res.redirect(302, `https://${target}/entry${qs}`);
});

app.get('/status', (req, res) => res.json({ healthy: [...healthy] }));

app.listen(PORT, '0.0.0.0', () => console.log(`[gateway] :${PORT}`));