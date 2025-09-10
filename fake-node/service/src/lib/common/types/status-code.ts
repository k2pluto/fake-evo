export enum ApiStatusCode {
  // 성공
  Success = 0,
  // 인증 실패
  Unathorized = 1010,

  InvalidSession = 1015,

  // 유저를 찾을 수 없음
  UserNotFound = 1020,
  // 유저 잔고 부족
  InsufficientBalance = 1030,
  // 에이전트 잔고 부족
  InsufficientAgentBalance = 1040,
  // 이미 작업중 (아직 남아있는 작업이 있음)
  WorkInProgress = 1050,
  // 잘못된 파라미터
  InvalidParameter = 1060,
  // 유저를 생성할 수 없습니다.
  CanNotCreateUser = 1070,
  // 입잘할 수 없습니다.
  CanNotOpenTheGame = 1080,

  // 허용되지 않은 벤더입니다.
  NotAllowVendor = 1085,

  // 데이터를 찾을 수 없습니다.
  DataNotFound = 1090,

  // 내부 서버 에러
  InternalServerError = 2000,
  // 심리스 Url이 설정되지 않았습니다.
  SeamlessError = 2010,

  // 내부 서버 에러
  Maintenence = 2020,
}
