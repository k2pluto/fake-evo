export enum RequestType {
  
  Session = 'session',
  Login = 'login',
  Logout = 'logout',
  UserInfo = 'userInfo',
  CreateRoom = 'createRoom',
  GetTables = 'getTables',
  EnterRoom = 'enterRoom',
  StartGame = 'startGame',
  Bet = 'bet',


  
  tableLogin = 'tablelogin',
  tableBetWait = 'tablebetwait',
  tableBetStart = 'tablebetstart',
  tableBetCount = 'tablebetcount',
  tableBetEnd = 'tablebetend',
  
  tableGameFinish = 'tablegamefinish',
  tableResult = 'tablewait',


  tableJoin = 'tablejoin',


  tableLeave = 'tableleave',

}

export enum PushType {
  lobbyHistory = 'lobbyHistory',
  UpdateBalance = 'updateBalance',
  EnterRoom = 'enterRoom',
  BetWinders = 'betWinders',
  Ranks = 'ranks',
  betStart = 'betstart',
  betEnd = 'betend',
  gameFinishBalance = 'gamefinishbalance',
  gameFinish = 'gamefinish',
  LeaveRoom = 'leaveRoom',
  GameError = 'gameError',
  GameStart = 'gameStart',
  PreFlop = 'preFlop',
  Flop = 'flop',
  Turn = 'turn',
  River = 'river',
  GameEnded = 'gameEnded',
  NeedBet = 'needBet',
  PlayerBet = 'playerBet',
}
