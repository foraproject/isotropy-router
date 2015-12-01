/* @flow */
import pathToRegexp from "path-to-regexp";

const decode = function(val: string) : string | void {
  if (val) return decodeURIComponent(val);
};

export default class HttpMethodRoute {
    method: string;
    url: string;
    re: RegExp;
    handler: HandlerType;

    constructor(url: string, method: string, handler: HandlerType) {
        this.url = url;
        this.method = method;
        this.handler = handler;
        this.re = pathToRegexp(url);
    }

    async handle(context: ContextType) : Promise {
        if (!this.method || (this.method === context.method)) {
            const m = this.re.exec(context.path || "");
            if (m) {
                const args = m.slice(1).map(decode);
                await this.handler.apply(context, [context].concat(args));
                return false;
            }
        }
        return true;
    }
}
