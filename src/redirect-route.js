/* @flow */
import pathToRegexp from "path-to-regexp";
import parse from "parseurl";

import type { IncomingMessage, ServerResponse } from "./flow/http";
import type { RouteHandlerType, RouteHandlerResultType } from "./isotropy-router";

export default class RedirectRoute {
  re: RegExp;
  from: string;
  to: string;
  code: number;

  constructor(fromUrl: string, toUrl: string, code: number = 301) {
    this.from = fromUrl;
    this.to = toUrl;
    this.code = code;
    this.re = pathToRegexp(fromUrl);
  }

  async handle(req: IncomingMessage, res: ServerResponse) : Promise<RouteHandlerResultType> {
    const parsed = parse(req);
    if (parsed.path !== "") {
      const m = this.re.exec(parsed.path);
      if (m) {
        res.writeHead(302, { 'Location': this.to });
        res.end();
      }
      return { handled: true };
    }
    else {
      return { handled: false };
    }
  }
}
