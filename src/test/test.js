import __polyfill from "babel-polyfill";
import should from 'should';
import Router from "../isotropy-router";
import HttpMethodRoute from "../http-method-route";
import PredicateRoute from "../predicate-route";
import RedirectRoute from "../redirect-route";
import koa from "koa";
import http from "http";

describe("Isotropy router", () => {

    it("Must add an array of routes", () => {
        const router = new Router();
        const handler = async (context) => {};
        router.add([
            { url: "/", method: "GET", handler },
            { url: "/a", method: "GET", handler },
            { url: "/a/b", method: "GET", handler },
            { type: "redirect", from: "/a/b", to: "/a/c", handler }
        ]);
        router.routes.length.should.equal(4);
    });


    ["get", "post", "del", "put", "patch"].forEach((method) => {
        it(`Must add a ${method.toUpperCase()} route`, () => {
            const router = new Router();
            const handler = async (context) => {};
            router[method.toLowerCase()]("/a", handler);
            router.routes.length.should.equal(1);
            router.routes[0].method.should.equal(method !== "del" ? method.toUpperCase() : "DELETE");
            router.routes[0].should.be.instanceOf(HttpMethodRoute);
        });
    });


    it(`Must add a redirect`, () => {
        const router = new Router();
        router.redirect("/a", "/b", 301);
        router.routes.length.should.equal(1);
        router.routes[0].should.be.instanceOf(RedirectRoute);

    });


    it(`Must add a predicate`, () => {
        const router = new Router();
        const handler = async (context) => {};
        router.when(() => true, handler);
        router.routes.length.should.equal(1);
        router.routes[0].should.be.instanceOf(PredicateRoute);
    });

    const urlData = [
        {
            route: { url: "/a", method: "GET" },
            request: { url: "/a", method: "GET" },
            match: true
        },
        {
            route: { url: "/a", method: "POST" },
            request: { url: "/a", method: "GET" },
            match: false
        },
        {
            route: { url: "/a/b", method: "GET" },
            request: { url: "/a/baaa", method: "GET" },
            match: false
        },
        {
            route: { url: "/a/b/c/", method: "GET" },
            request: { url: "/a/b/c", method: "GET" },
            match: true
        },
        {
            route: { url: "/", method: "GET" },
            request: { url: "/", method: "GET" },
            match: true
        },
        {
            route: { url: "/", method: "GET" },
            request: { url: "/baa", method: "GET" },
            match: false
        },
        {
            route: { url: "/a/:id/", method: "GET" },
            request: { url: "/a/100", method: "GET" },
            arguments: ["100"],
            match: true
        },
        {
            route: { url: "/a/:id/:subid", method: "GET" },
            request: { url: "/a/100/300", method: "GET" },
            arguments: ["100", "300"],
            match: true
        }
    ];

    urlData.forEach(r => {
        it(`Mock ${r.request.method} ${r.request.url} ${r.match ? "should" : "should not"} match route { url: "${r.route.url}", method: "${r.route.method}" }`, () => {
            r.arguments = r.arguments || [];
            const router = new Router();
            let called = false;
            let nextCalled = false;
            let handlerArgs = [];
            const handler = async function() { handlerArgs = Array.prototype.slice.call(arguments); called = true; };
            const next = async () => { nextCalled = true; };
            router[r.route.method.toLowerCase()](r.route.url, handler);
            return router.doRouting(
                {
                    path: r.request.url,
                    method: r.request.method.toUpperCase()
                },
                next
            ).then(() => {
                if (r.match) {
                    called.should.be.true();
                } else {
                    called.should.be.false();
                }
                r.arguments.forEach((a, i) => {
                    a.should.equal(handlerArgs[i]);
                });
                nextCalled.should.be.true();
            });
        })
    });


    const makeRequest = (port, host, path, method, headers, cb, onErrorCb) => {
        const options = { host, port, path, method, headers };

        let result = "";
        const req = http.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function(data) { result += data; });
            res.on('end', function() { cb(result); });
        });
        req.on('error', function(e) { onErrorCb(e); });
        req.end();
    };


    urlData.forEach(r => {
        it(`Koa ${r.request.method} ${r.request.url} ${r.match ? "should" : "should not"} match route { url: "${r.route.url}", method: "${r.route.method}" }`, () => {
            let called = false;
            let handlerArgs = [];

            const app = new koa();

            const promise = new Promise((resolve, reject) => {
                r.arguments = r.arguments || [];

                const handler = async function() { handlerArgs = Array.prototype.slice.call(arguments); called = true; };

                const router = new Router();
                router[r.route.method.toLowerCase()](r.route.url, handler);

                app.use((context, next) => router.doRouting(context, next));
                app.listen(function(err) {
                    if (err) {
                        reject(err);
                    }
                    makeRequest(this.address().port, "localhost", r.request.url, r.request.method, { 'Content-Type': 'application/x-www-form-urlencoded' }, resolve, reject);
                });
            });

            return promise.then(() => {
                if (r.match) {
                    called.should.be.true();
                } else {
                    called.should.be.false();
                }
                r.arguments.forEach((a, i) => {
                    a.should.equal(handlerArgs[i]);
                });
            });
        })
    });

});
