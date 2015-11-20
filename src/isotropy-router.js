/* @flow */
import pathToRegexp from "path-to-regexp";

const decode = function(val: string) : string | void {
  if (val) return decodeURIComponent(val);
};

type HandlerType = () => void;
type RoutingEventHandlerType = (context: Object) => void;
type PredicateType = (context: Object) => bool;
type NextType = () => void;

//Route types
type RouteType = { type: "redirect", re: RegExp, from: string, to: string, code: number } |
                 { type: "predicate", predicate: PredicateType, handler: HandlerType } |
                 { type: "pattern", method: string, url: string, re: RegExp, handler: HandlerType };

class Router {

    routes: Array<RouteType>;
    beforeRoutingHandlers: Array<RoutingEventHandlerType>;
    afterRoutingHandlers: Array<RoutingEventHandlerType>;

    constructor() {
        this.routes = [];
        this.beforeRoutingHandlers = [];
        this.afterRoutingHandlers = [];
    }

    add(routes: Array<RouteType>) {
        let self = this;
        if (routes && routes.length) {
            routes.forEach(route => {
                switch (route.type) {
                    case "predicate":
                        this.when(route.predicate, route.handler);
                        break;
                    case "redirect":
                        this.redirect(route.from, route.to, route.code);
                        break;
                    default:
                        switch (route.method.toUpperCase()) {
                            case "GET":
                                this.get(route.url, route.handler);
                                break;
                            case "POST":
                                this.post(route.url, route.handler);
                                break;
                            case "DELETE":
                                this.del(route.url, route.handler);
                                break;
                            case "PUT":
                                this.put(route.url, route.handler);
                                break;
                            case "PATCH":
                                this.patch(route.url, route.handler);
                                break;
                        }
                        break;
                }
            });
        }
    }

    get(url: string, handler: HandlerType) {
        this.addPattern("GET", url, handler);
    }


    post(url: string, handler: HandlerType) {
        this.addPattern("POST", url, handler);
    }


    del(url: string, handler: HandlerType) {
        this.addPattern("DELETE", url, handler);
    }


    put(url: string, handler: HandlerType) {
        this.addPattern("PUT", url, handler);
    }


    patch(url: string, handler: HandlerType) {
        this.addPattern("PATCH", url, handler);
    }


    redirect(fromUrl: string, toUrl: string, code: number = 301) {
        if (fromUrl[0] !== "/") { fromUrl = "/" + fromUrl; }
        if (toUrl[0] !== "/") { toUrl = "/" + toUrl; }
        this.routes.push({ type: "redirect", from: fromUrl, to: toUrl, re: pathToRegexp(fromUrl), code });
    }


    addPattern(method: string, url: string, handler: HandlerType) {
        if (url[0] !== "/") { url = "/" + url; }
        this.routes.push({ type: "pattern", method: method.toUpperCase(), re: pathToRegexp(url), url: url, handler: handler });
    }


    when(predicate: PredicateType, handler: HandlerType) {
        this.routes.push({ type: "predicate", predicate: predicate, handler: handler });
    }


    beforeRouting(fn: RoutingEventHandlerType) {
        this.beforeRoutingHandlers.push(fn);
    }


    afterRouting(fn: RoutingEventHandlerType) {
        this.afterRoutingHandlers.push(fn);
    }


    async doRouting(context: Object, next: NextType) : Promise {
        for(let i = 0; i < this.beforeRoutingHandlers.length; i++) {
            await this.beforeRoutingHandlers[i](context, next);
        }

        let keepChecking = true;
        for(let i = 0; i < this.routes.length; i++) {
            const route: Object = this.routes[i];
            switch (route.type) {
                case "predicate":
                    if (route.predicate(context)) {
                        const matchOtherRoutes = await route.handler(context);
                        keepChecking = matchOtherRoutes;
                    }
                    break;
                case "redirect": {
                    const m = route.re.exec(context.path || "");
                    if (m) {
                        context.code = route.code || 301;
                        context.redirect(route.to);
                        keepChecking = false;
                    }
                    break;
                }
                case "pattern":
                    if (!route.method || (route.method === context.method)) {
                        const m = route.re.exec(context.path || "");
                        if (m) {
                            const args = m.slice(1).map(decode);
                            await route.handler.apply(context, args);
                            keepChecking = false;
                        }
                    }
                    break;
            }

            if (!keepChecking) {
                break;
            }
        }

        await next();

        for(let i = 0; i < this.afterRoutingHandlers.length; i++) {
            await this.afterRoutingHandlers[i](context, next);
        }
    };
}

export default Router;
