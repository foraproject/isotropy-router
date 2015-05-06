(function () {
    "use strict";

    var pathToRegexp = require('path-to-regexp');

    var Router = function () {
        this.routes = [];
        this.onRequestHandlers = [];
    };


    Router.prototype.get = function(url, handler) {
        this.addPattern("GET", url, handler);
    };


    Router.prototype.post = function(url, handler) {
        this.addPattern("POST", url, handler);
    };


    Router.prototype.del = function(url, handler) {
        this.addPattern("DELETE", url, handler);
    };


    Router.prototype.put = function(url, handler) {
        this.addPattern("PUT", url, handler);
    };


    Router.prototype.addPattern = function(method, url, handler) {
        this.routes.push({ type: "pattern", method: method.toUpperCase(), re: pathToRegexp(url), url: url, handler: handler });
    };


    Router.prototype.onRequest = function(fn) {
        this.onRequestHandlers.push(fn);
    };


    Router.prototype.when = function(predicate, handler) {
        this.routes.push({ type: "predicate", predicate: predicate, handler: handler });
    };


    var decode = function(val) {
      if (val) return decodeURIComponent(val);
    };


    Router.prototype.doRouting = function*(context, next) {
        for(let i = 0; i < this.onRequestHandlers.length; i++) {
            yield* this.onRequestHandlers[i].call(this, next);
        }

        for(var i = 0; i < this.routes.length; i++) {
            var route = this.routes[i];
            switch (route.type) {
                case "predicate":
                    if (route.predicate.call(context)) {
                        var matchOtherRoutes = yield* route.handler.call(context);
                        if (!matchOtherRoutes)
                            return next ? (yield next) : void 0;
                    }
                    break;
                case "pattern":
                    if (route.method === context.method) {
                        var m = route.re.exec(context.path || "");
                        if (m) {
                            var args = m.slice(1).map(decode);
                            yield* route.handler.apply(context, args);
                            return next ? (yield next) : void 0;
                        }
                    }
                    break;
            }
        }

        return next ? (yield next) : void 0;
    };


    module.exports = Router;

})();
