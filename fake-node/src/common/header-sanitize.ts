// src/common/header-sanitize.ts
export function sanitizeVendorHeaders(
  headers: Record<string, any>,
  targetUrl: string
): Record<string, string> {
  const url = new URL(targetUrl);
  const vendorHost = url.hostname;

  // 1) 키 소문자화
  const h: Record<string, any> = {};
  for (const [k, v] of Object.entries(headers || {})) {
    h[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }

  // 2) 제거 목록
  const dropExact = new Set<string>([
    'via',
    'host',
    ':authority',
    'x-real-ip',
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-forwarded-host',
    'cf-connecting-ip',
    'cf-ipcountry',
    'cf-ray',
    'cf-visitor',
    'purpose',
    'sec-purpose',
    'connection',
    'upgrade-insecure-requests',
    // 필요 시 추가: 'cookie', 'origin', 'referer', ...
  ]);

  // 3) 허용할 수 있는 최소 헤더만 남기고 싶다면 allowlist로 바꾸세요.
  // 여기서는 요청하신 항목만 제거하고 나머지는 그대로 둡니다.
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (dropExact.has(k)) continue;
    if (k.startsWith('x-forwarded-')) continue; // x-forwarded-*
    if (k.startsWith('cf-')) continue;          // cf-*
    // 필요 시: if (k.startsWith('sec-')) continue; // sec-* 도 제거 가능
    out[k] = v as string;
  }
// 필수 최소 헤더는 남겨 두는 걸 권장(UA, Accept 등)
  if (!out['user-agent']) out['user-agent'] = 'Mozilla/5.0';
  if (!out['accept']) out['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
  if (!out['accept-language']) out['accept-language'] = 'en-US,en;q=0.5';

  // 4) 반드시 벤더 호스트로 강제
  out['host'] = vendorHost;

  return out;
}