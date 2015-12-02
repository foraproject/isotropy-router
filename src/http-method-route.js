/* @flow */
import pathToRegexp from "path-to-regexp";

const decode = function(val: string) : string {
  return val ? decodeURIComponent(val) : "";
};

export default class HttpMethodRoute {
    method: string;
    url: string;
    re: RegExp;
    handler: HandlerType;
    keys: Array<PathToRegExpKeyType>;


    constructor(url: string, method: string, handler: HandlerType) {
        this.keys = [];
        this.url = url;
        this.method = method;
        this.handler = handler;
        this.re = pathToRegexp(url, this.keys);
    }


    async handle(context: ContextType) : Promise<RouteHandlerResultType> {
        if (!this.method || (this.method === context.method)) {
            const m = this.re.exec(context.path || "");
            if (m) {
                const args = m.slice(1).map(decode);
                const result = await this.handler.apply(context, [context].concat(args));
                return { keepChecking: false, args, keys: this.keys, result };
            }
        }
        return { keepChecking: true };
    }
}
