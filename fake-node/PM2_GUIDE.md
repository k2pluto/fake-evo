# PM2 실행 및 관리 가이드

## 📋 목차
- [PM2란?](#pm2란)
- [설치](#설치)
- [기본 실행 방법](#기본-실행-방법)
- [클러스터 모드 (성능 최적화)](#클러스터-모드-성능-최적화)
- [프로세스 관리](#프로세스-관리)
- [로그 관리](#로그-관리)
- [모니터링](#모니터링)
- [환경 변수 설정](#환경-변수-설정)
- [ecosystem.config.js 설정](#ecosystemconfigjs-설정)
- [자동 시작 설정](#자동-시작-설정)
- [문제 해결](#문제-해결)

---

## PM2란?

PM2는 Node.js 애플리케이션을 위한 프로덕션 프로세스 매니저입니다.

### 주요 기능:
- ✅ **자동 재시작**: 크래시 시 자동 복구
- ✅ **클러스터 모드**: 멀티코어 CPU 활용으로 성능 향상
- ✅ **무중단 배포**: 서비스 중단 없이 업데이트
- ✅ **로그 관리**: 자동 로그 수집 및 관리
- ✅ **모니터링**: 실시간 CPU/메모리 모니터링
- ✅ **메모리 관리**: 메모리 임계값 초과 시 자동 재시작

---

## 설치

### PM2 설치
```bash
npm install -g pm2
```

### 설치 확인
```bash
pm2 --version
```

---

## 기본 실행 방법

### 1. 단순 실행
```bash
pm2 start out/main.js
```

### 2. 이름 지정하여 실행
```bash
pm2 start out/main.js --name fake-evo
```

### 3. 환경 변수와 함께 실행
```bash
pm2 start out/main.js --name fake-evo -- --env production
```

### 4. 특정 환경 변수 설정
```bash
DEBUG_SETTLEMENT=true pm2 start out/main.js --name fake-evo
```

---

## 클러스터 모드 (성능 최적화)

클러스터 모드를 사용하면 모든 CPU 코어를 활용하여 처리량을 배수로 증가시킬 수 있습니다.

### 모든 CPU 코어 사용
```bash
pm2 start out/main.js --name fake-evo -i max
```

### 특정 개수의 인스턴스 실행
```bash
# 4개 인스턴스 실행
pm2 start out/main.js --name fake-evo -i 4
```

### CPU 코어 수 확인
```bash
# macOS/Linux
sysctl -n hw.ncpu

# 또는 PM2로 확인
pm2 start out/main.js -i 0  # CPU 코어 수만큼 자동 생성
```

### 클러스터 모드 장점
- **4코어 CPU**: 약 4배 처리량 증가
- **8코어 CPU**: 약 8배 처리량 증가
- WebSocket 연결은 자동으로 로드밸런싱됨

---

## 프로세스 관리

### 프로세스 목록 확인
```bash
pm2 list
# 또는
pm2 ls
```

### 프로세스 상세 정보
```bash
pm2 show fake-evo
```

### 프로세스 중지
```bash
pm2 stop fake-evo
```

### 프로세스 재시작
```bash
# 일반 재시작 (순간 중단 발생)
pm2 restart fake-evo

# 무중단 재시작 (클러스터 모드일 때)
pm2 reload fake-evo
```

### 프로세스 삭제
```bash
pm2 delete fake-evo
```

### 모든 프로세스 관리
```bash
pm2 stop all       # 모두 중지
pm2 restart all    # 모두 재시작
pm2 delete all     # 모두 삭제
```

---

## 로그 관리

### 실시간 로그 확인
```bash
# 모든 프로세스 로그
pm2 logs

# 특정 프로세스 로그
pm2 logs fake-evo

# 최근 N줄만 보기
pm2 logs fake-evo --lines 100

# 에러 로그만 보기
pm2 logs fake-evo --err
```

### 로그 파일 위치
```bash
# 기본 위치: ~/.pm2/logs/
ls ~/.pm2/logs/

# 출력 예시:
# fake-evo-out.log    (표준 출력)
# fake-evo-error.log  (에러 출력)
```

### 로그 비우기
```bash
pm2 flush
```

### 로그 파일 크기 제한 (권장)
```bash
pm2 install pm2-logrotate

# 로그 크기 제한 설정
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 모니터링

### 실시간 모니터링 대시보드
```bash
pm2 monit
```

표시 정보:
- CPU 사용률
- 메모리 사용량
- 실시간 로그
- 프로세스 상태

### 간단한 상태 확인
```bash
pm2 status
```

### 웹 기반 모니터링 (PM2 Plus)
```bash
# 무료 모니터링 서비스 연결
pm2 register
pm2 link [secret] [public]
```

---

## 환경 변수 설정

### 방법 1: 직접 전달
```bash
DEBUG_SETTLEMENT=true pm2 start out/main.js --name fake-evo
```

### 방법 2: ecosystem.config.js 사용 (권장)
```bash
pm2 start ecosystem.config.js
```

### 환경 변수 업데이트
```bash
# 환경 변수 변경 후 재시작
pm2 restart fake-evo --update-env
```

---

## ecosystem.config.js 설정

프로젝트 루트에 `ecosystem.config.js` 파일을 생성하면 설정을 파일로 관리할 수 있습니다.

### 기본 설정 파일 예시
```javascript
module.exports = {
  apps: [
    {
      name: 'fake-evo',
      script: './out/main.js',
      instances: 'max',  // 모든 CPU 코어 사용
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        DEBUG_SETTLEMENT: 'false',
      },
      env_development: {
        NODE_ENV: 'development',
        DEBUG_SETTLEMENT: 'true',
      },
      max_memory_restart: '1G',  // 1GB 초과 시 재시작
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}
```

### 환경별 설정 예시
```javascript
module.exports = {
  apps: [
    {
      name: 'fake-evo-prod',
      script: './out/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        STAGE_ENV: 'korea',
        FAKE_VENDOR: 'fcevo',
        DEBUG_SETTLEMENT: 'false',
      },
      max_memory_restart: '2G',
    },
    {
      name: 'fake-evo-dev',
      script: './out/main.js',
      instances: 1,
      env: {
        STAGE_ENV: 'test',
        DEBUG_SETTLEMENT: 'true',
      },
    },
  ],
}
```

### ecosystem.config.js로 실행
```bash
# 프로덕션 환경
pm2 start ecosystem.config.js

# 개발 환경
pm2 start ecosystem.config.js --env development

# 특정 앱만 실행
pm2 start ecosystem.config.js --only fake-evo-prod
```

### 설정 업데이트
```bash
# 설정 파일 수정 후
pm2 reload ecosystem.config.js
```

---

## 자동 시작 설정

서버 재부팅 시 PM2와 애플리케이션이 자동으로 시작되도록 설정

### 1. 스타트업 스크립트 생성
```bash
pm2 startup
```

출력된 명령어를 복사해서 실행 (예시):
```bash
sudo env PATH=$PATH:/usr/local/bin pm2 startup systemd -u username --hp /home/username
```

### 2. 현재 프로세스 목록 저장
```bash
pm2 save
```

### 3. 자동 시작 확인
```bash
# 서버 재부팅 후
pm2 list
```

### 자동 시작 해제
```bash
pm2 unstartup
```

---

## 문제 해결

### 프로세스가 계속 재시작됨
```bash
# 로그 확인
pm2 logs fake-evo --err

# 상세 정보 확인
pm2 show fake-evo

# 자동 재시작 비활성화 (디버깅용)
pm2 start out/main.js --no-autorestart
```

### 메모리 누수 의심
```bash
# 메모리 사용량 모니터링
pm2 monit

# 메모리 제한 설정
pm2 restart fake-evo --max-memory-restart 1G
```

### 포트 충돌
```bash
# 기존 프로세스 확인
lsof -i :443
lsof -i :3000

# PM2 프로세스 모두 종료
pm2 kill
```

### PM2 데몬 재시작
```bash
pm2 kill
pm2 resurrect  # 저장된 프로세스 목록 복구
```

### 로그가 너무 커짐
```bash
# 로그 삭제
pm2 flush

# 로그 로테이션 설치 (권장)
pm2 install pm2-logrotate
```

---

## 실전 운영 시나리오

### 시나리오 1: 최초 배포
```bash
# 1. 빌드
npm run build

# 2. PM2로 실행
pm2 start ecosystem.config.js

# 3. 상태 확인
pm2 list
pm2 logs

# 4. 자동 시작 설정
pm2 startup
pm2 save
```

### 시나리오 2: 코드 업데이트
```bash
# 1. 빌드
npm run build

# 2. 무중단 재시작 (클러스터 모드)
pm2 reload fake-evo

# 또는 일반 재시작
pm2 restart fake-evo
```

### 시나리오 3: 디버그 모드 활성화
```bash
# 1. ecosystem.config.js 수정
# env.DEBUG_SETTLEMENT = 'true'

# 2. 재시작
pm2 reload ecosystem.config.js

# 3. 로그 확인
pm2 logs fake-evo
```

### 시나리오 4: 긴급 중지
```bash
# 모든 프로세스 즉시 중지
pm2 stop all

# 또는 특정 프로세스만
pm2 stop fake-evo
```

---

## 성능 최적화 팁

### 1. 클러스터 모드 사용
```bash
pm2 start out/main.js -i max
```

### 2. 메모리 제한 설정
```bash
pm2 start out/main.js --max-memory-restart 1G
```

### 3. 로그 로테이션
```bash
pm2 install pm2-logrotate
```

### 4. 디버그 로그 비활성화
```javascript
// ecosystem.config.js
env: {
  DEBUG_SETTLEMENT: 'false',
}
```

### 5. Node.js 옵션 최적화
```javascript
// ecosystem.config.js
node_args: '--max-old-space-size=2048',  // 힙 메모리 증가
```

---

## 유용한 명령어 모음

```bash
# 빠른 참조
pm2 list                    # 프로세스 목록
pm2 logs                    # 로그 확인
pm2 monit                   # 모니터링
pm2 restart fake-evo        # 재시작
pm2 reload fake-evo         # 무중단 재시작
pm2 stop fake-evo           # 중지
pm2 delete fake-evo         # 삭제
pm2 save                    # 현재 상태 저장
pm2 resurrect               # 저장된 상태 복구
pm2 flush                   # 로그 삭제

# 고급 명령어
pm2 reset fake-evo          # 재시작 카운터 리셋
pm2 scale fake-evo 4        # 인스턴스 개수 변경
pm2 describe fake-evo       # 상세 정보
pm2 env 0                   # 환경 변수 확인
```

---

## 참고 자료

- 공식 문서: https://pm2.keymetrics.io/docs/usage/quick-start/
- GitHub: https://github.com/Unitech/pm2
- PM2 Plus (모니터링): https://pm2.io/

---

## 작성 정보
- 작성 일자: 2025-10-06
- 프로젝트: fake-evo
- 작성자: Claude (AI Assistant)
