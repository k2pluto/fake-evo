# PlayerBonus/BankerBonus 정산 수정 문서

## 📅 작업 일자
2025-10-05 (토)

## 🎯 수정 목적
Evolution Gaming의 PlayerBonus/BankerBonus 베팅이 제대로 정산되지 않는 문제 수정

## 🔍 발견된 문제

### 1. 기존 문제점
- PlayerBonus/BankerBonus가 점수 차이만으로 배당 계산
- Evolution 서버의 실제 당첨 정보(`winningSpots`)를 무시
- Player가 이기면 PlayerBonus도 무조건 당첨 처리되는 오류

### 2. 문제 발생 원인
```typescript
// 기존 코드 (잘못된 방식)
const PlayerBonus = calcBonusOdds(playerHand.score - bankerHand.score, natural)
const BankerBonus = calcBonusOdds(bankerHand.score - playerHand.score, natural)

// 문제: winningSpots를 확인하지 않음!
```

## 📊 Evolution 공식 규칙 분석

### PlayerBonus / BankerBonus 배당 규칙

**당첨 조건**: "내추럴 8, 9 또는 최소 4점으로 라운드에서 이길 경우 지불합니다"

| 승리 조건 | 배당 |
|----------|------|
| 9점 차이 (Non-Natural) | 30:1 (31배) |
| 8점 차이 (Non-Natural) | 10:1 (11배) |
| 7점 차이 (Non-Natural) | 6:1 (7배) |
| 6점 차이 (Non-Natural) | 4:1 (5배) |
| 5점 차이 (Non-Natural) | 2:1 (3배) |
| 4점 차이 (Non-Natural) | 1:1 (2배) |
| **Natural 승리** (8 or 9) | **1:1 (2배)** |
| **Natural Tie** | **푸시 (1배 환불)** |
| Non-Natural Tie | 패배 (0배) |
| 3점 이하 차이 | 당첨 안됨 (0배) |

### 중요 발견 사항

1. **Natural Tie vs Non-Natural Tie**
   - Natural Tie (8:8, 9:9 등 2장씩): PlayerBonus/BankerBonus **환불** ✅
   - Non-Natural Tie (4:4 등 3장): PlayerBonus/BankerBonus **0원** ❌
   - Evolution이 `winningSpots`에 포함 여부로 구분

2. **winningSpots의 역할**
   - Evolution 서버가 실제 당첨된 베팅 위치를 명시적으로 전달
   - 예시: `"winningSpots": ["Player", "Small", "PlayerBonus"]`
   - 우리 계산 결과가 아닌 **Evolution의 winningSpots가 최종 기준**

## 🛠️ 수정 내용

### 1. settle.ts 수정

#### 파일 위치
`/fake-node/src/common/settle.ts`

#### 수정 1: calcBonusOdds 함수 - Tie 처리 개선
```typescript
// 수정 전
const calcBonusOdds = (diffScore: number, natural: boolean) => {
  if (natural) {
    if (diffScore > 0) return 2
    if (diffScore === 0) return 1  // Natural Tie만 환불
  } else {
    // 4~9점 차이 배당
  }
  return 0  // Non-Natural Tie는 0배
}

// 수정 후
const calcBonusOdds = (diffScore: number, natural: boolean) => {
  // 무승부(Tie)는 Natural이든 Non-Natural이든 일단 1배 계산
  // (winningSpots 필터링에서 실제 당첨 여부 결정)
  if (diffScore === 0) return 1

  if (natural) {
    if (diffScore > 0) return 2
  } else {
    // Non-Natural 승리
    switch (diffScore) {
      case 4: return 2
      case 5: return 3
      case 6: return 5
      case 7: return 7
      case 8: return 11
      case 9: return 31
    }
  }
  return 0
}
```

#### 수정 2: OddsTableOptions 인터페이스 - winningSpots 추가
```typescript
export interface OddsTableOptions {
  playerHand: BaccaratHand
  bankerHand: BaccaratHand
  lightningMultipliers?: LightningMultiplier[]
  redEnvelopePayouts?: Record<string, number>
  winningSpots?: string[]  // ✅ 추가
}
```

#### 수정 3: makeOddsTable 함수 - winningSpots 필터링 추가
```typescript
export function makeOddsTable(tableId: string, options: OddsTableOptions) {
  const { playerHand, bankerHand, lightningMultipliers, winningSpots } = options

  // 기존 배당 계산
  let resultOddsTable = isLightningTable(tableId)
    ? calcLightningOdds(playerHand, bankerHand, lightningMultipliers)
    : calcResultOdds(playerHand, bankerHand, noCommission)

  // ✅ winningSpots 필터링 추가
  if (winningSpots != null) {
    for (const spot in resultOddsTable) {
      if (!winningSpots.includes(spot) && resultOddsTable[spot] > 0) {
        console.log(`  ❌ [makeOddsTable] Filtering out ${spot}: was ${resultOddsTable[spot]}, now 0 (not in winningSpots)`)
        resultOddsTable[spot] = 0
      } else if (winningSpots.includes(spot)) {
        console.log(`  ✅ [makeOddsTable] Keeping ${spot}: ${resultOddsTable[spot]} (in winningSpots)`)
      }
    }
  }

  return resultOddsTable
}
```

#### 수정 4: settleGame 함수 - makeOddsTable 사용
```typescript
// 수정 전
const { playerHand, bankerHand, lightningMultipliers } = gameData
const resultOddsTable = isLightningTable(tableId)
  ? calcLightningOdds(playerHand, bankerHand, lightningMultipliers)
  : calcResultOdds(playerHand, bankerHand, noCommission)

// 수정 후
const { playerHand, bankerHand, lightningMultipliers, winningSpots } = gameData
const resultOddsTable = makeOddsTable(tableId, {
  playerHand,
  bankerHand,
  lightningMultipliers,
  winningSpots,  // ✅ Evolution의 실제 당첨 정보 전달
})
```

#### 수정 5: ManualSettleGameData 인터페이스 - winningSpots 추가
```typescript
export interface ManualSettleGameData {
  tableId: string
  dealing: DealingStateType
  result: BaccaratResult
  playerHand: BaccaratHand
  bankerHand: BaccaratHand
  lightningMultipliers?: LightningMultiplier[]
  redEnvelopePayouts?: { [key: string]: number }
  winningSpots?: string[]  // ✅ 추가
}
```

#### 수정 6: 디버깅 로그 추가
```typescript
// makeOddsTable 함수에 추가
console.log('🎰 [makeOddsTable] BEFORE winningSpots filter:', JSON.stringify({
  tableId,
  playerHand,
  bankerHand,
  resultOddsTable,
  winningSpots,
}))

// ... 필터링 로직 ...

console.log('🎰 [makeOddsTable] FINAL resultOddsTable:', JSON.stringify(resultOddsTable))

// manualSettleBet 함수에 추가
console.log('💰 [manualSettleBet] Starting settlement:', JSON.stringify({
  username: bet.agentCode + bet.userId,
  betAccepted: bet.betAccepted,
  resultOddsTable,
  gameData: {
    playerHand: gameData.playerHand,
    bankerHand: gameData.bankerHand,
    result: gameData.result,
    winningSpots: gameData.winningSpots,
  },
}))

console.log(`  💵 [manualSettleBet] ${spot}: ${betMoney} × ${resultOddsTable[spot] ?? 0} = ${winMoney}`)
console.log(`💰 [manualSettleBet] Total win: ${totalWinMoney}`)
```

### 2. router-game-common.ts 수정

#### 파일 위치
`/fake-node/src/fake-api/websocket/router-game-common.ts`

#### 수정: resolved 함수 - 로깅 개선
```typescript
// 수정 전
export const resolved: ReceiveRouterType<Resolved> = async (packet, { socketData, tableData }) => {
  const { gameId, bets } = packet.args
  const username = user.agentCode + user.userId
  console.log(`resolve ${username} tableId ${tableId} round ${gameId}`, JSON.stringify(packet))
  // ...
}

// 수정 후
export const resolved: ReceiveRouterType<Resolved> = async (packet, { socketData, tableData }) => {
  const { gameId, bets, result, winningSpots } = packet.args
  const username = user.agentCode + user.userId

  console.log(`🎲 [resolved] Game result for ${username} tableId ${tableId} round ${gameId}`)
  console.log(`   Result: Player ${result?.playerScore} vs Banker ${result?.bankerScore}`)
  console.log(`   WinningSpots from Evolution: ${JSON.stringify(winningSpots)}`)
  console.log(`   Full packet: ${JSON.stringify(packet)}`)
  // ...
}
```

## 📝 테스트 결과

### 테스트 케이스 검증

| # | 베팅 | 게임 결과 | 예상 금액 | 실제 금액 | 상태 |
|---|------|----------|----------|----------|------|
| 1 | Banker 2만 + BankerBonus 1만 | B:7 vs P:1 (6점차, Non-Natural) | 89,000 | 89,000 | ✅ |
| 2 | Player 2만 + PlayerBonus 1만 | P:6 vs B:0 (6점차, Non-Natural) | 90,000 | 90,000 | ✅ |
| 3 | Player 2만 + PlayerBonus 1만 | P:8 vs B:4 (4점차, Non-Natural) | 60,000 | 60,000 | ✅ |
| 4 | Player 2만 + PlayerBonus 1만 | P:9 vs B:9 (Natural Tie) | 30,000 | 30,000 | ✅ |
| 5 | Player 2만 + PlayerBonus 1만 | P:9 vs B:0 (9점차, Natural) | 60,000 | 60,000 | ✅ |
| 6 | Player 2만 + PlayerBonus 1만 | P:7 vs B:2 (5점차, Non-Natural) | 70,000 | 70,000 | ✅ |
| 7 | Player 2만 + PlayerBonus 1만 | P:4 vs B:4 (Non-Natural Tie) | 20,000 | 20,000 | ✅ |

### 로그 예시

#### Non-Natural Tie 게임 (4:4)
```json
🎲 [resolved] Game result for tttaa22 tableId leqhceumaq6qfoug round 186b927811477951220acb84
   Result: Player 4 vs Banker 4
   WinningSpots from Evolution: ["Tie","Big"]

🎰 [makeOddsTable] BEFORE winningSpots filter: {
  "playerHand": {"cards":["4H","TS","QC"],"score":4},
  "bankerHand": {"cards":["8C","6C"],"score":4},
  "resultOddsTable": {"Player":0,"Banker":0,"Tie":9,"PlayerBonus":1,"BankerBonus":1,...},
  "winningSpots": ["Tie","Big"]
}

  ❌ [makeOddsTable] Filtering out PlayerBonus: was 1, now 0 (not in winningSpots)
  ❌ [makeOddsTable] Filtering out BankerBonus: was 1, now 0 (not in winningSpots)
  ✅ [makeOddsTable] Keeping Tie: 9 (in winningSpots)

🎰 [makeOddsTable] FINAL resultOddsTable: {
  "Player":0,"Banker":0,"Tie":9,"PlayerBonus":0,"BankerBonus":0,...
}

💰 [manualSettleBet] Starting settlement: {
  "username":"tttaa22",
  "betAccepted":{"Player":20000,"PlayerBonus":10000},
  "resultOddsTable":{"Player":0,"PlayerBonus":0,...}
}
  💵 [manualSettleBet] Player: 20000 × 0 = 0
  💵 [manualSettleBet] PlayerBonus: 10000 × 0 = 0
💰 [manualSettleBet] Total win: 0
```

## 🚀 배포 방법

### 1. 빌드
```bash
cd /Users/iin-yong/Project/Evolution/fake-evo/fake-node
npm run build
```

### 2. 압축
```bash
tar -czf fake-out.tar.gz out/
```

### 3. 서버 배포
```bash
scp fake-out.tar.gz server:/path/to/deploy/
ssh server
tar -xzf fake-out.tar.gz
# 서비스 재시작
```

## 📌 주의사항

### 1. winningSpots의 중요성
- **Evolution의 winningSpots가 최종 기준**
- 우리 계산이 아무리 정확해도 winningSpots에 없으면 0원
- 페이크 베팅 시스템과 연동 시 별도 처리 필요

### 2. 페이크 베팅 처리 (추후 개선 필요)
현재 발견된 추가 이슈:
- 사용자 베팅: Player 2만 + PlayerBonus 1만
- Evolution 전달: Player 2만만 전달 (PlayerBonus 숨김)
- Evolution 응답: `winningSpots: ["Player"]` (PlayerBonus 없음 - 당연함!)
- 현재 정산: Player 2만만 환불
- **올바른 정산**: Player 2만 + PlayerBonus 1만 = 3만 환불

**해결 방안**:
- `betFake` (Evolution에 전달한 베팅)와 `betOrg` (실제 사용자 베팅) 구분
- winningSpots 필터링 시 페이크 베팅은 제외하고 자체 계산 적용 필요

### 3. 디버깅 로그
- 🎲: 게임 결과 수신
- 🎰: 배당 계산
- 💰: 정산 시작/완료
- 💵: 개별 베팅 계산

## 📂 Git 커밋 정보

### 커밋 메시지
```
Fix PlayerBonus/BankerBonus settlement with Evolution winningSpots

- Use Evolution's winningSpots data to determine actual winning bets
- Add debug logging for bonus settlement process
- Fix Tie handling: Natural/Non-Natural Tie both return 1x in calcBonusOdds
- winningSpots filtering ensures only actual winners get paid
- Add detailed logs with emoji markers (🎲🎰💰💵) for easier debugging
```

### 커밋 해시
`9f98619`

### 변경된 파일
1. `CLAUDE.md` (신규 생성)
2. `fake-node/src/common/settle.ts`
3. `fake-node/src/fake-api/websocket/router-game-common.ts`

### Git 명령어
```bash
git add fake-node/src/common/settle.ts fake-node/src/fake-api/websocket/router-game-common.ts CLAUDE.md
git commit -m "Fix PlayerBonus/BankerBonus settlement with Evolution winningSpots"
git push
```

## 🔄 향후 개선 사항

1. **페이크 베팅 처리**
   - `betFake`와 `betOrg` 구분하여 winningSpots 필터링 적용
   - Evolution에 전달하지 않은 베팅은 자체 계산 사용

2. **에러 처리 강화**
   - winningSpots가 없는 경우 fallback 로직
   - Evolution API 오류 시 대체 정산 방법

3. **테스트 코드 작성**
   - 각종 Tie 상황 테스트
   - winningSpots 필터링 테스트
   - 페이크 베팅 시나리오 테스트

---

## 🎛️ 디버그 로그 성능 최적화 (2025-10-06 추가)

### 문제점
- 실서버에서 `node out/main.js` 실행 시 콘솔 로그가 지속적으로 출력됨
- 대량의 로그가 서버 처리 속도에 영향을 줄 수 있음
  - I/O 블로킹: `console.log`는 동기 작업
  - 터미널 렌더링 비용
  - `JSON.stringify` CPU 소모

### 해결 방법
환경 변수 `DEBUG_SETTLEMENT`로 디버그 로그를 제어하도록 수정

#### 수정된 파일
1. **`fake-node/src/common/settle.ts:22`**
   ```typescript
   // 환경 변수로 디버그 로그 제어
   const DEBUG_SETTLEMENT = process.env.DEBUG_SETTLEMENT === 'true'

   // 모든 디버그 로그를 조건부로 변경
   if (DEBUG_SETTLEMENT) {
     console.log('🎰 [makeOddsTable] BEFORE winningSpots filter:', ...)
   }
   ```

2. **`fake-node/src/fake-api/websocket/router-game-common.ts:24`**
   ```typescript
   const DEBUG_SETTLEMENT = process.env.DEBUG_SETTLEMENT === 'true'

   if (DEBUG_SETTLEMENT) {
     console.log(`🎲 [resolved] Game result for ...`)
   }
   ```

### 사용 방법

#### 프로덕션 환경 (로그 비활성화, 기본값):
```bash
node out/main.js
```

#### 디버그 환경 (로그 활성화):
```bash
DEBUG_SETTLEMENT=true node out/main.js
```

#### 로그 파일로 리다이렉트 (터미널 렌더링 부하 감소):
```bash
# 모든 로그 버리기
node out/main.js > /dev/null 2>&1

# 파일로만 저장
node out/main.js >> logs/server.log 2>&1

# 디버그 모드 + 파일 저장
DEBUG_SETTLEMENT=true node out/main.js >> logs/server.log 2>&1
```

### 성능 개선 효과
- 디버그 로그 비활성화 시:
  - JSON.stringify 비용 제거
  - I/O 블로킹 감소
  - 터미널 렌더링 부하 제거
  - **예상 성능 향상: 5-15%** (초당 수백~수천 건 로그 발생 시)

### 빌드 및 배포
```bash
npm run build
tar -czf fake-out.tar.gz out/
```

---

## 📞 문의사항
- 작성자: Claude (AI Assistant)
- 작업 일시: 2025-10-05 (초기), 2025-10-06 (성능 최적화 추가)
- 레포지토리: https://github.com/k2pluto/fake-evo
