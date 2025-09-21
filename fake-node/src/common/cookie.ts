// src/common/cookie.ts
export function buildCookieHeader(setCookie: string[] | string | undefined, prevCookie = ''): string {
  // prevCookie: 직전 단계에서 우리가 들고 있는 Cookie 문자열(있으면 병합)

  // 기존 쿠키를 map으로
  const jar = new Map<string, string>();
  const putNV = (nv: string) => {
    const idx = nv.indexOf('=');
    if (idx <= 0) return;
    const name = nv.slice(0, idx).trim();
    const value = nv.slice(idx + 1).trim().replace(/^"|"$/g, '');
    if (!name || !value) return;      // 빈 값은 skip
    jar.set(name, value);             // 같은 name은 최신값으로 덮기
  };

  // prevCookie 파싱(name=value; name2=value2 ...)
  if (prevCookie) {
    for (const token of prevCookie.split(';')) {
      const nv = token.trim();
      if (!nv) continue;
      putNV(nv);
    }
  }

  // Set-Cookie 반영
  if (setCookie) {
    const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const sc of arr) {
      // "name=value; Path=/; Domain=...; Secure; HttpOnly; ..." 형태
      const first = sc.split(';', 1)[0]?.trim() ?? '';
      if (!first.includes('=')) continue;
      putNV(first);
    }
  }

  // EVOSESSIONID가 빈 문자열이던 기록이 있었다면 jar에 들어오지 않으니 자동 제외됨.
  // 최종 문자열 생성 (순서는 안정적으로 name 알파벳순)
  return Array.from(jar.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}