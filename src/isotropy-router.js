import pathToRegexp from 'path-to-regexp';

const decode = function(val) {
  if (val) return decodeURIComponent(val);
};

class Router {

    constructor() {
        this.routes = [];
        this.onRequestHandlers = [];
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


    addPattern(method, url, handler) {
        this.routes.push({ type: "pattern", method: method.toUpperCase(), re: pathToRegexp(url), url: url, handler: handler });
    }


    onRequest(fn) {
        this.onRequestHandlers.push(fn);
    }


    when(predicate, handler) {
        this.routes.push({ type: "predicate", predicate: predicate, handler: handler });
    }


    async doRouting(context, next) {
        for(let i = 0; i < this.onRequestHandlers.length; i++) {
            await this.onRequestHandlers[i].call(this, next);
        }

        for(let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];
            switch (route.type) {
                case "predicate":
                    if (route.predicate.call(context)) {
                        const matchOtherRoutes = await route.handler.call(context);
                        if (!matchOtherRoutes)
                            return next ? (await next) : void 0;
                    }
                    break;
                case "pattern":
                    if (route.method === context.method) {
                        const m = route.re.exec(context.path || "");
                        if (m) {
                            const args = m.slice(1).map(decode);
                            await route.handler.apply(context, args);
                            return next ? (await next) : void 0;
                        }
                    }
                    break;
            }
        }

        return next ? (await next) : void 0;
    };
}

export default Router;
