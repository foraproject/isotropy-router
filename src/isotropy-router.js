/* @flow */
import pathToRegexp from "path-to-regexp";
import HttpMethodRoute from "./http-method-route";
import PredicateRoute from "./predicate-route";
import RedirectRoute from "./redirect-route";

import type { IncomingMessage, ServerResponse } from "./flow/http";
import type { PredicateType } from "./predicate-route";
import type { HttpMethodRouteOptionsType } from "./http-method-route";

import type { PathToRegExpKeyType } from "path-to-regexp";

export type RouteHandlerType = (...args: Array<any>) => Promise;
export type RouteType = PredicateRoute | RedirectRoute | HttpMethodRoute;

export type { PredicateType }
export type { HttpMethodRouteOptionsType };

export type PredicateRouteArgsType = { type: "predicate", predicate: PredicateType, handler: RouteHandlerType }
export type RedirectRouteArgsType = { type: "redirect", from: string, to: string, code: number }
export type HttpMethodRouteArgsType = { type: "pattern", method: string, url: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType }

export type AddRouteArgsType =  PredicateRouteArgsType | RedirectRouteArgsType | HttpMethodRouteArgsType;

export type RouteHandlerResultType = {
  handled: boolean,
  keys?: Array<PathToRegExpKeyType>,
  args?: Array<string>,
  result?: any
};

export default class Router {

  routes: Array<RouteType>;
  beforeRoutingHandlers: Array<RouteHandlerType>;
  afterRoutingHandlers: Array<RouteHandlerType>;
  mounts: Array<{ pathPrefix: string, router: Router }>;

  constructor() {
    this.routes = [];
    this.beforeRoutingHandlers = [];
    this.afterRoutingHandlers = [];
    this.mounts = [];
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


  any(url: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
    return this.addPattern(url, "", handler, options);
  }


  get(url: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
    return this.addPattern(url, "GET", handler, options);
  }


  post(url: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
    return this.addPattern(url, "POST", handler, options);
  }


  del(url: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
    return this.addPattern(url, "DELETE", handler, options);
  }


  put(url: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
    return this.addPattern(url, "PUT", handler, options);
  }


  patch(url: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
    return this.addPattern(url, "PATCH", handler, options);
  }


  mount(pathPrefix: string, router: Router) : void {
    this.mounts.push({ pathPrefix, router });
  }


  addPattern(url: string, method: string, handler: RouteHandlerType, options?: HttpMethodRouteOptionsType) : HttpMethodRoute {
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


  when(predicate: PredicateType, handler: RouteHandlerType) : PredicateRoute {
    const route = new PredicateRoute(predicate, handler);
    this.routes.push(route);
    return route;
  }


  beforeRouting(fn: RouteHandlerType) {
    this.beforeRoutingHandlers.push(fn);
  }


  afterRouting(fn: RouteHandlerType) {
    this.afterRoutingHandlers.push(fn);
  }


  async doRouting(req: IncomingMessage, res: ServerResponse) : Promise<Array<RouteHandlerResultType>> {
    const matchResult: Array<RouteHandlerResultType> = [];

    for(let i = 0; i < this.beforeRoutingHandlers.length; i++) {
      await this.beforeRoutingHandlers[i](req, res);
    }

    let wasHandled = false;

    //See if there are other routers handling this path
    const matchingMounts = this.mounts.filter(m => {
      const pathPrefix = (/\/$/.test(m.pathPrefix) ? m.pathPrefix : `${m.pathPrefix}/`).toLowerCase();
      return `${req.url}/`.toLowerCase().indexOf(pathPrefix) === 0;
    });

    if (matchingMounts.length) {
      const pathWithoutSlash = matchingMounts[0].pathPrefix.replace(/\/$/, "");
      const originalUrl = req.url;
      req.url = req.url.substring(pathWithoutSlash.length);
      await matchingMounts[0].router.doRouting(req, res);
      req.url = originalUrl;
      wasHandled = true;
    }
    else {
      for(let i = 0; i < this.routes.length; i++) {
        const route = this.routes[i];
        const routeHandlerResult = await route.handle(req, res);
        matchResult.push(routeHandlerResult);
        if (routeHandlerResult.handled) {
          wasHandled = true;
        }
        if (routeHandlerResult.handled) {
          break;
        }
      }
    }

    if (!wasHandled) {
      res.writeHead(404, {"Content-Type": "text/plain"});
      res.write("Not Found\n");
      res.end();
    }

    for(let i = 0; i < this.afterRoutingHandlers.length; i++) {
      await this.afterRoutingHandlers[i](req, res, matchResult);
    }

    return matchResult;
  };
}
