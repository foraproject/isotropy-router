declare module "parseurl" {
  declare type IncomingMessage = {
    headers: Object;
    httpVersion: string;
    method: string;
    trailers: Object;
    setTimeout: (msecs: number, callback: Function) => void;
    statusCode: number;
    url: string;
  }

  declare type ParseResultType = {
    path: string;
  };

  declare function exports(req: IncomingMessage) : ParseResultType;
}
