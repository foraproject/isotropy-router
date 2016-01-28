/* @flow */
export class IncomingMessage {
  headers: Object;
  httpVersion: string;
  method: string;
  trailers: Object;
  setTimeout: (msecs: number, callback: Function) => void;
  statusCode: number;
  url: string;
}

export class ServerResponse {
  writeHead: (code: number, headers: Object) => void;
  write: (data: string) => void;
  end: () => void;
}
