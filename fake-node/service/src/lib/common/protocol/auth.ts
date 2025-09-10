// import { IsNotEmpty } from 'class-validator'
// import { DataUser } from '../../lib/interface/mongo/data.user'
// import { DataTable } from '../../lib/interface/mongo/data.table'

// export namespace Login{

//   export class Request {
//     // @IsNotEmpty()
//     account: string

//     // @IsNotEmpty()
//     password: String
//   }

//   export class Response {
//     user:DataUser
//   }
// }

// export namespace LoginSession{

//   export class Request {
//     // @IsNotEmpty()
//     message: string
//   }

//   export class Response {
//     user:DataUser
//   }
// }

// export namespace Logout{

//   export class Request {
//   }

//   export class Response {
//   }
// }

// export namespace UserInfo{

//   export class Request {
//   }

//   export class Response {
//     user:DataUser
//   }
// }

// export namespace TableLogin{

//   export class Request {
//     tableId: string
//     password: string
//   }

//   export class Response {
//     table :DataTable
//     status : string
//   }
// }

// export namespace TableBetWait{

//   export class Request {
//     tableId: string
//     password: string
//     session: string
//     gameNumber: string
//     gameId: string

//     betDelay: number

//   }

//   export class Response {
//     gameIDX : String
//   }
// }

// export namespace TableBetCount{

//   export class Request {
//     tableId: string
//     password: string
//     session: string
//     gameIDX : string
//     count  : number

//   }

//   export class Response {
//   }
// }

// export namespace TableBetFinish{

//   export class Request {
//     result : any
//     tableId: string
//     gameIDX : string
//     session : string

//   }

//   export class Response {
//   }
// }
