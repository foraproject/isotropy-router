declare module "parseurl" {
  declare interface EventEmitter {
    on: (eventName: string, cb: Function) => void;
    removeAllListeners: () => void;
  }

  declare interface IncomingMessage extends EventEmitter {
    headers: Object;
    httpVersion: string;
    method: string;
    pipe: (dest: any) => void;
    trailers: Object;
    setTimeout: (cb: Function, msec: number) => void;
    statusCode: number;
    url: string;
  }

  declare type ParseResultType = {
    path: string;
  };

  declare function exports(req: IncomingMessage) : ParseResultType;
}
