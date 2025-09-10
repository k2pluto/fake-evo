

export namespace  StartGame {
    export class Request {
        roomId: string;
    }
    export class Response {
    }
}


export namespace  Bet {
    export class Request {
        tableId: string;
        gameId: string;
        bets: any;
    }
    
    export class Response {
    }
}
