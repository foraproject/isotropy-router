/* @flow */
import type { KoaHandlerType, KoaContextType } from "./flow/koa-types";
import type { PathToRegExpKeyType } from "path-to-regexp";
import type { RouteHandlerResultType } from "./isotropy-router";
import pathToRegexp from "path-to-regexp";

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
  handler: KoaHandlerType;
  keys: Array<PathToRegExpKeyType>;
  options: HttpMethodRouteOptionsType;

  constructor(url: string, method: string, handler: KoaHandlerType, options?: HttpMethodRouteOptionsType) {
    this.keys = [];
    this.url = url;
    this.method = method;
    this.handler = handler;
    this.options = options || { argumentsAsObject: false };
    this.re = pathToRegexp(url, this.keys);
  }


  async handle(context: KoaContextType) : Promise<RouteHandlerResultType> {
    if (!this.method || (this.method === context.method)) {
      const m = this.re.exec(context.path || "");
      if (m) {
        const args = m.slice(1).map(decode);

        if (this.options.argumentsAsObject === true) {
          const objArgs = {};
          this.keys.forEach((key, i) => {
            objArgs[key.name] = args[i];
          });
          const result = await this.handler.apply(context, [context, objArgs]);
          return { keepChecking: false, args, keys: this.keys, result };
        } else {
          const result = await this.handler.apply(context, [context].concat(args));
          return { keepChecking: false, args, keys: this.keys, result };
        }
      }
    }
    return { keepChecking: true };
  }
}
