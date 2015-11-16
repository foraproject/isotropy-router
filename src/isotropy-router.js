import pathToRegexp from "path-to-regexp";

const decode = function(val) {
  if (val) return decodeURIComponent(val);
};

class Router {

    constructor() {
        this.routes = [];
        this.beforeRoutingHandlers = [];
        this.afterRoutingHandlers = [];
    }

    add(routes) {
        let self = this;
        if (routes && routes.length) {
            routes.forEach(route => {
                switch(route.type) {
                    case "redirect":
                        this.redirect(route.from, route.to, route.code);
                        break;
                    default:
                        this[route.method.toLowerCase()](route.url, route.handler);
                        break;
                }
            });
        }
    }

    get(url, handler) {
        this.addPattern("GET", url, handler);
    }


    post(url, handler) {
        this.addPattern("POST", url, handler);
    }


    del(url, handler) {
        this.addPattern("DELETE", url, handler);
    }


    put(url, handler) {
        this.addPattern("PUT", url, handler);
    }


    patch(url, handler) {
        this.addPattern("PATCH", url, handler);
    }


    redirect(fromUrl, toUrl, code) {
        this.routes.push({ type: "redirect", from: fromUrl, to: toUrl, re: pathToRegexp(fromUrl), code });
    }


    addPattern(method, url, handler) {
        this.routes.push({ type: "pattern", method: method.toUpperCase(), re: pathToRegexp(url), url: url, handler: handler });
    }


    when(predicate, handler) {
        this.routes.push({ type: "predicate", predicate: predicate, handler: handler });
    }


    beforeRouting(fn) {
        this.beforeRoutingHandlers.push(fn);
    }


    afterRouting(fn) {
        this.afterRoutingHandlers.push(fn);
    }


    async doRouting(context, next) {
        for(let i = 0; i < this.beforeRoutingHandlers.length; i++) {
            await this.beforeRoutingHandlers[i].call(this, next);
        }

        let keepChecking = true;
        for(let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];
            switch (route.type) {
                case "predicate":
                    if (route.predicate.call(context)) {
                        const matchOtherRoutes = await route.handler.call(context);
                        keepChecking = matchOtherRoutes;
                    }
                    break;
                case "redirect": {
                    const m = route.re.exec(context.path || "");
                    if (m) {
                        this.code = route.code || 301;
                        this.redirect(route.to);
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
            await this.afterRoutingHandlers[i].call(this, next);
        }
    };
}

export default Router;
