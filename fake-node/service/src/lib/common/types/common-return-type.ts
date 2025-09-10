export enum CommonReturnType {
  // 에이전트도 사용하는 리턴 타입
  Success,
  UserNotFound,
  TransactionNotFound,
  TransactionAlreadyRollback,
  TransactionExists,
  AlreadySettle,
  InvalidBetMoney,
  InsufficientBalance,
  NotAllowedBet,
  DatabaseError,
  InvalidParameter,
  InternalServerError,
  DisabledVendor,
  InvalidToken,
  ZeroCancelBet, /// 14
  InvalidCurrency,

  // 여기서 부터는 플루토만 사용하는 리턴 타입
  SeamlessNoResponse = 100,
  SeamlessInternalError,
  AgentNotFound,
  InsufficientAgentBalance,
  Unathorized,
  VendorError,
  //작업이 이미 진행중
  WorkInProgress,
  NotImplementation,

  EvolutionBetMoneyZero = 200,
}
