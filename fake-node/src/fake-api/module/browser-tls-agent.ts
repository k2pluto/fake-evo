import https from 'https'

// Agent pool for reuse (key: host:browser)
const customAgentPool = new Map<string, https.Agent>()
const AGENT_MAX_AGE = 5 * 60 * 1000 // 5 minutes

// Browser-specific TLS configurations
const browserConfigs = {
  chrome: {
    ciphers: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-CHACHA20-POLY1305',
      'ECDHE-RSA-CHACHA20-POLY1305',
      'ECDHE-RSA-AES128-SHA',
      'ECDHE-RSA-AES256-SHA',
      'AES128-GCM-SHA256',
      'AES256-GCM-SHA384',
      'AES128-SHA',
      'AES256-SHA',
    ].join(':'),
    ecdhCurve: 'X25519:P-256:P-384',
    sigalgs: [
      'ecdsa_secp256r1_sha256',
      'rsa_pss_rsae_sha256',
      'rsa_pkcs1_sha256',
      'ecdsa_secp384r1_sha384',
      'rsa_pss_rsae_sha384',
      'rsa_pkcs1_sha384',
      'rsa_pss_rsae_sha512',
      'rsa_pkcs1_sha512',
    ].join(':'),
  },
  safari: {
    ciphers: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-CHACHA20-POLY1305',
      'ECDHE-RSA-CHACHA20-POLY1305',
      'ECDHE-RSA-AES256-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'AES256-GCM-SHA384',
      'AES128-GCM-SHA256',
    ].join(':'),
    ecdhCurve: 'X25519:P-256:P-384:P-521',
    sigalgs: [
      'ecdsa_secp256r1_sha256',
      'rsa_pss_rsae_sha256',
      'rsa_pkcs1_sha256',
      'ecdsa_secp384r1_sha384',
      'ecdsa_secp521r1_sha512',
      'rsa_pss_rsae_sha384',
      'rsa_pss_rsae_sha512',
      'rsa_pkcs1_sha384',
      'rsa_pkcs1_sha512',
    ].join(':'),
  },
  firefox: {
    ciphers: [
      'TLS_AES_128_GCM_SHA256',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_256_GCM_SHA384',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-CHACHA20-POLY1305',
      'ECDHE-RSA-CHACHA20-POLY1305',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA',
      'ECDHE-RSA-AES256-SHA',
      'AES128-GCM-SHA256',
      'AES256-GCM-SHA384',
      'AES128-SHA',
      'AES256-SHA',
    ].join(':'),
    ecdhCurve: 'X25519:P-256:P-384:P-521',
    sigalgs: [
      'ecdsa_secp256r1_sha256',
      'ecdsa_secp384r1_sha384',
      'ecdsa_secp521r1_sha512',
      'rsa_pss_rsae_sha256',
      'rsa_pss_rsae_sha384',
      'rsa_pss_rsae_sha512',
      'rsa_pkcs1_sha256',
      'rsa_pkcs1_sha384',
      'rsa_pkcs1_sha512',
    ].join(':'),
  },
}

export function detectBrowser(userAgent: string): 'chrome' | 'safari' | 'firefox' {
  if (!userAgent) return 'chrome'

  const ua = userAgent.toLowerCase()

  // Safari detection (must be before Chrome, as Safari UA contains Chrome)
  if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) {
    return 'safari'
  }

  // Firefox detection
  if (ua.includes('firefox') || ua.includes('fxios')) {
    return 'firefox'
  }

  // Chrome/Edge/Chromium (default)
  return 'chrome'
}

export function getOrCreateBrowserAgent(host: string, userAgent: string): https.Agent {
  const browser = detectBrowser(userAgent)
  const poolKey = `${host}:${browser}`

  const existingAgent = customAgentPool.get(poolKey)
  if (existingAgent) {
    return existingAgent
  }

  const config = browserConfigs[browser]

  const customAgent = new https.Agent({
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    ciphers: config.ciphers,
    ecdhCurve: config.ecdhCurve,
    sigalgs: config.sigalgs,
    maxCachedSessions: 100,
    sessionTimeout: 300,
    rejectUnauthorized: true,
    honorCipherOrder: false,
    ALPNProtocols: ['http/1.1'],
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 100,
  })

  customAgentPool.set(poolKey, customAgent)

  // Auto-cleanup after max age
  setTimeout(() => {
    customAgentPool.delete(poolKey)
    customAgent.destroy()
  }, AGENT_MAX_AGE)

  return customAgent
}
