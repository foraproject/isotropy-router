/* @flow */
import parse from "parseurl";
import pathToRegexp from "path-to-regexp";

import type { IncomingMessage, ServerResponse } from "isotropy-interfaces/node/http";
import type { PathToRegExpKeyType } from "path-to-regexp";
import type { RouteHandlerType, RouteHandlerResultType } from "./isotropy-router";

export type HttpMethodRouteOptionsType = {
  argumentsAsObject: boolean
};

const decode = function(val: string) : string {
  return val ? decodeURIComponent(val) : "";
};

export default class HttpMethodRoute {
  method: string;
  url: string;
  re: RegExp;
  handler: RouteHandlerType;
  keys: Array<PathToRegExpKeyType>;
  options: HttpMethodRouteOptionsType;

  constructor(url: string, method: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType) {
    this.keys = [];
    this.url = url;
    this.method = method;
    this.handler = handler;
    this.options = options || { argumentsAsObject: false };
    this.re = pathToRegexp(url, this.keys);
  }

  async handle(req: IncomingMessage, res: ServerResponse) : Promise<RouteHandlerResultType> {
    if (!this.method || (this.method === req.method)) {
      const parsed = parse(req);
      const m = this.re.exec(parsed.path || "");
      if (m) {
        const args = m.slice(1).map(decode);
        if (this.options.argumentsAsObject === true) {
          const objArgs = {};
          this.keys.forEach((key, i) => {
            objArgs[key.name] = args[i];
          });
          const result = await this.handler(req, res, objArgs);
          return { handled: true, args, result };
        } else {
          const result = await this.handler.apply(null, [req, res].concat(args));
          return { handled: true, args, result };
        }
      }
    }
    return { handled: false };
  }
}
