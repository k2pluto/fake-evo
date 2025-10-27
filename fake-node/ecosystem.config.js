module.exports = {
  apps: [
    {
      name: 'fake-evo',
      script: './out/main.js',

      // 클러스터 모드 설정
      instances: 'max',  // CPU 코어 수만큼 인스턴스 생성 (또는 숫자로 지정: 4)
      exec_mode: 'cluster',  // 클러스터 모드 활성화

      // 환경 변수 (프로덕션)
      env: {
        NODE_ENV: 'production',
        STAGE_ENV: 'korea',
        FAKE_VENDOR: 'fcevo',
        DEBUG_SETTLEMENT: 'false',  // 디버그 로그 비활성화
      },

      // 개발 환경 변수
      env_development: {
        NODE_ENV: 'development',
        STAGE_ENV: 'test',
        DEBUG_SETTLEMENT: 'true',  // 디버그 로그 활성화
      },

      // 메모리 관리
      max_memory_restart: '1G',  // 1GB 초과 시 자동 재시작

      // 로그 설정
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,  // 클러스터 모드에서 로그 병합

      // 재시작 정책
      autorestart: true,  // 크래시 시 자동 재시작
      max_restarts: 10,  // 최대 재시작 횟수
      min_uptime: '10s',  // 최소 가동 시간 (이보다 짧으면 비정상 종료로 간주)

      // Watch 모드 (개발 시에만 사용)
      watch: false,

      // Node.js 옵션
      node_args: '--max-old-space-size=2048',  // 힙 메모리 2GB
    },

    // 추가 설정 예시: 단일 인스턴스 (디버깅용)
    {
      name: 'fake-evo-debug',
      script: './out/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        STAGE_ENV: 'test',
        DEBUG_SETTLEMENT: 'true',
      },
      autorestart: false,  // 디버깅 시 자동 재시작 비활성화
      watch: false,
    },
  ],
}
