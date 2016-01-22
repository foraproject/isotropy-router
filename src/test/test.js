import __polyfill from "babel-polyfill";
import should from 'should';
import Router from "../isotropy-router";
import HttpMethodRoute from "../http-method-route";
import PredicateRoute from "../predicate-route";
import RedirectRoute from "../redirect-route";
import koa from "koa";
import http from "http";


const makeRequest = (host, port, path, method, headers, cb, onErrorCb) => {
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
      route: { url: "/a/b/c/", method: "POST" },
      request: { url: "/a/b/c", method: "POST" },
      match: true
    },
    {
      route: { url: "/a/b/c/", method: "PATCH" },
      request: { url: "/a/b/c", method: "PATCH" },
      match: true
    },
    {
      route: { url: "/a/b/c/", method: "DELETE" },
      request: { url: "/a/b/c", method: "DELETE" },
      match: true
    },
    {
      route: { url: "/a/b/c/", method: "PUT" },
      request: { url: "/a/b/c", method: "PUT" },
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
      paramNames: ["id", "subid"],
      match: true
    },
    {
      route: { url: "/a/:id/:subid", method: "GET" },
      request: { url: "/a/100/300", method: "GET" },
      arguments: ["100", "300"],
      paramNames: ["id", "subid"],
      match: true,
      argumentsAsObject: true
    }
  ];

  ["Mock", "Koa"].forEach(testType => {
    urlData.forEach(r => {

      const strArgs = r.arguments && r.arguments.length ?
      ` and capture ${(r.argumentsAsObject ?`${r.arguments} as Object` : `${r.arguments}`)}` :
      ``;

      it(`${testType} ${r.request.method} ${r.request.url} ${r.match ? "should" : "should not"} match route { url: "${r.route.url}", method: "${r.route.method}" }${strArgs}`, () => {
        r.arguments = r.arguments || [];
        const router = new Router();
        let called = false;
        let nextCalled = false;
        let handlerArgs = [];
        const handler = async function(context) { handlerArgs = Array.prototype.slice.call(arguments); called = true; context.body = "Hello, World"; };
        const next = async () => { nextCalled = true; };
        const methodName = r.route.method.toLowerCase() === "delete" ? "del" : r.route.method.toLowerCase();
        router[methodName](r.route.url, handler, { argumentsAsObject: r.argumentsAsObject });

        const promise = new Promise((resolve, reject) => {
          if (testType === "Mock") {
            resolve(
              router.doRouting(
                {
                  path: r.request.url,
                  method: r.request.method.toUpperCase()
                },
                next
              )
            );
          } else if ((testType === "Koa")) {
            const app = new koa();
            app.use((context, next) => router.doRouting(context, next));
            app.listen(function(err) {
              if (err) {
                reject(err);
              }
              makeRequest("localhost", this.address().port, r.request.url, r.request.method, { 'Content-Type': 'application/x-www-form-urlencoded' }, resolve, reject);
            });
          }
        });

        return promise.then((result) => {
          if (r.paramNames) {
            r.paramNames.length.should.equal(router.routes[0].keys.length);
            r.paramNames.forEach((p, i) => {
              p.should.equal(router.routes[0].keys[i].name);
            });
          }

          if (r.match) {
            called.should.be.true();
          } else {
            called.should.be.false();
          }

          if (r.argumentsAsObject) {
            const arg = handlerArgs[1];
            r.paramNames.forEach((p, i) => {
              p.should.equal(router.routes[0].keys[i].name);
              arg[p].should.equal(r.arguments[i]);
            });
          } else {
            r.arguments.forEach((a, i) => {
              a.should.equal(handlerArgs[i + 1]);
            });
          }

          if (testType === "Mock") {
            nextCalled.should.be.true();
          }
        });
      })
    });
  });


  it(`Must not call the second handler if the first one has already handled the request.`, () => {
    let called = false;
    let handlerArgs = [];
    let called2 = false;
    let handlerArgs2 = [];

    const app = new koa();

    const promise = new Promise((resolve, reject) => {
      const handler = async function() { handlerArgs = Array.prototype.slice.call(arguments); called = true; };
      const handler2 = async function() { handlerArgs2 = Array.prototype.slice.call(arguments); called2 = true; };

      const router = new Router();
      router.get("/a1", handler);
      router.get("/a1", handler2);

      app.use((context, next) => router.doRouting(context, next));
      app.listen(function(err) {
        if (err) {
          reject(err);
        }
        makeRequest("localhost", this.address().port, "/a1", "GET", { 'Content-Type': 'application/x-www-form-urlencoded' }, resolve, reject);
      });
    });

    return promise.then(() => {
      called.should.be.true();
      called2.should.be.false();
    });
  })


});
