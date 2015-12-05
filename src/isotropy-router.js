/* @flow */
import type { KoaHandlerType, KoaContextType } from "koa";
import type { PredicateType } from "./predicate-route";
import type { HttpMethodRouteOptionsType } from "./http-method-route";
import { PathToRegExpKeyType } from "path-to-regexp";

import HttpMethodRoute from "./http-method-route";
import PredicateRoute from "./predicate-route";
import RedirectRoute from "./redirect-route";

type RoutingEventHandlerType = (context: KoaContextType) => Promise;
type NextType = () => void;
type RouteType = PredicateRoute | RedirectRoute | HttpMethodRoute;

type AddRouteArgsType = { type: "redirect", re: RegExp, from: string, to: string, code: number } |
                        { type: "predicate", predicate: PredicateType, handler: KoaHandlerType } |
                        { type: "pattern", method: string, url: string, re: RegExp, handler: KoaHandlerType, options: HttpMethodRouteOptionsType };

export type RouteHandlerResultType = {
    keepChecking: boolean,
    keys?: Array<PathToRegExpKeyType>,
    args?: Array<string>,
    result?: any
};

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
                        if (route.method) {
                            switch (route.method.toUpperCase()) {
                                case "GET":
                                    this.get(route.url, route.handler, route.options);
                                    break;
                                case "POST":
                                    this.post(route.url, route.handler, route.options);
                                    break;
                                case "DELETE":
                                    this.del(route.url, route.handler, route.options);
                                    break;
                                case "PUT":
                                    this.put(route.url, route.handler, route.options);
                                    break;
                                case "PATCH":
                                    this.patch(route.url, route.handler, route.options);
                                    break;
                                default:
                                    throw new Error("Unsupported HTTP method");
                            }
                        } else {
                            this.any(route.url, route.handler, route.options);
                        }
                        break;
                }
            });
        }
        return this.routes;
    }


    any(url: string, handler: KoaHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
        return this.addPattern(url, "", handler, options);
    }


    get(url: string, handler: KoaHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
        return this.addPattern(url, "GET", handler, options);
    }


    post(url: string, handler: KoaHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
        return this.addPattern(url, "POST", handler, options);
    }


    del(url: string, handler: KoaHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
        return this.addPattern(url, "DELETE", handler, options);
    }


    put(url: string, handler: KoaHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
        return this.addPattern(url, "PUT", handler, options);
    }


    patch(url: string, handler: KoaHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
        return this.addPattern(url, "PATCH", handler, options);
    }


    addPattern(url: string, method: string, handler: KoaHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
        const _url = url[0] !== "/" ? "/" + url : url;
        const route = new HttpMethodRoute(url, method.toUpperCase(), handler, options);
        this.routes.push(route);
        return route;
    }


    redirect(fromUrl: string, toUrl: string, code: number = 301) : RedirectRoute {
        const _fromUrl = fromUrl[0] !== "/" ? "/" + fromUrl : fromUrl;
        const _toUrl = toUrl[0] !== "/" ? "/" + toUrl : toUrl;
        const route = new RedirectRoute(_fromUrl, _toUrl, code);
        this.routes.push(route);
        return route;
    }


    when(predicate: PredicateType, handler: KoaHandlerType) : PredicateRoute {
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


    async doRouting(context: KoaContextType, next: NextType) : Promise<Array<RouteHandlerResultType>> {
        const matchResult: Array<RouteHandlerResultType> = [];

        for(let i = 0; i < this.beforeRoutingHandlers.length; i++) {
            await this.beforeRoutingHandlers[i](context, next);
        }

        let keepChecking = true;
        for(let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];
            const keepChecking = await route.handle(context);
            const routeHandlerResult = await route.handle(context);
            matchResult.push(routeHandlerResult);
            if (routeHandlerResult.keepChecking !== true) {
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
