import { RoomModel } from '../model/room.model';

export namespace  CreateRoom {
    export  class Request {
    }
    export  class Response {
        room: RoomModel;
    }
}

export namespace  GetRooms {
    export class Request {
    }
    export class Response {
        tables: RoomModel[];
        status: string;
    }
}

export namespace  EnterRoom {
    export class Request {
        tableId: string;
    }
    export class Response {
        status: string;
    }
}
