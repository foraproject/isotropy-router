/* @flow */
import HttpMethodRoute from "./http-method-route";
import PredicateRoute from "./predicate-route";
import RedirectRoute from "./redirect-route";

type RoutingEventHandlerType = (context: ContextType) => Promise;
type NextType = () => void;
type RouteType = PredicateRoute | RedirectRoute | HttpMethodRoute;

type AddRouteArgsType = { type: "redirect", re: RegExp, from: string, to: string, code: number } |
                        { type: "predicate", predicate: PredicateType, handler: HandlerType } |
                        { type: "pattern", method: string, url: string, re: RegExp, handler: HandlerType };

export default class Router {

    routes: Array<RouteType>;
    beforeRoutingHandlers: Array<RoutingEventHandlerType>;
    afterRoutingHandlers: Array<RoutingEventHandlerType>;

    constructor() {
        this.routes = [];
        this.beforeRoutingHandlers = [];
        this.afterRoutingHandlers = [];
    }

    add(routes: Array<AddRouteArgsType>) : Array<RouteType> {
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
                            default:
                                throw new Error("Unsupported HTTP method");
                        }
                        break;
                }
            });
        }
        return this.routes;
    }

    get(url: string, handler: HandlerType) : HttpMethodRoute {
        return this.addPattern(url, "GET", handler);
    }


    post(url: string, handler: HandlerType) : HttpMethodRoute {
        return this.addPattern(url, "POST", handler);
    }


    del(url: string, handler: HandlerType) : HttpMethodRoute {
        return this.addPattern(url, "DELETE", handler);
    }


    put(url: string, handler: HandlerType) : HttpMethodRoute {
        return this.addPattern(url, "PUT", handler);
    }


    patch(url: string, handler: HandlerType) : HttpMethodRoute {
        return this.addPattern(url, "PATCH", handler);
    }


    redirect(fromUrl: string, toUrl: string, code: number = 301) : RedirectRoute {
        const _fromUrl = fromUrl[0] !== "/" ? "/" + fromUrl : fromUrl;
        const _toUrl = toUrl[0] !== "/" ? "/" + toUrl : toUrl;
        const route = new RedirectRoute(_fromUrl, _toUrl, code);
        this.routes.push(route);
        return route;
    }


    addPattern(url: string, method: string, handler: HandlerType) : HttpMethodRoute {
        const _url = url[0] !== "/" ? "/" + url : url;
        const route = new HttpMethodRoute(url, method.toUpperCase(), handler);
        this.routes.push(route);
        return route;
    }


    when(predicate: PredicateType, handler: HandlerType) : PredicateRoute {
        const route = new PredicateRoute(predicate, handler);
        this.routes.push(route);
        return route;
    }


    beforeRouting(fn: RoutingEventHandlerType) {
        this.beforeRoutingHandlers.push(fn);
    }


    afterRouting(fn: RoutingEventHandlerType) {
        this.afterRoutingHandlers.push(fn);
    }


    async doRouting(context: ContextType, next: NextType) : Promise<Array<HandleResultType>> {
        const matchResult: Array<HandleResultType> = [];

        for(let i = 0; i < this.beforeRoutingHandlers.length; i++) {
            await this.beforeRoutingHandlers[i](context, next);
        }

        let keepChecking = true;
        for(let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];
            const keepChecking = await route.handle(context);
            const handleResult = await route.handle(context);
            matchResult.push(handleResult);
            if (handleResult.keepChecking !== true) {
                break;
            }
        }

        await next();

        for(let i = 0; i < this.afterRoutingHandlers.length; i++) {
            await this.afterRoutingHandlers[i](context, next);
        }

        return matchResult;
    };

}
