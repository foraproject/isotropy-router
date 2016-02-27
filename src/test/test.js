import __polyfill from "babel-polyfill";
import should from 'should';
import Router from "../isotropy-router";
import HttpMethodRoute from "../http-method-route";
import PredicateRoute from "../predicate-route";
import RedirectRoute from "../redirect-route";
import querystring from "querystring";
import stream from "stream";
import promisify from "nodefunc-promisify";
import http from "http";

const makeRequest = (host, port, path, method, headers, _postData) => {
  return new Promise((resolve, reject) => {
    const postData = (typeof _postData === "string") ? _postData : querystring.stringify(_postData);
    const options = { host, port, path, method, headers };

    let result = "";
    const req = http.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function(data) { result += data; });
      res.on('end', function() { resolve({ result, res }); });
    });
    req.on('error', function(e) { reject(e); });
    req.write(postData);
    req.end();
  });
};

describe("Isotropy router", () => {

  it("Adds an array of routes", () => {
    const router = new Router();
    const handler = async (req, res) => {};
    router.add([
      { url: "/", method: "GET", handler },
      { url: "/a", method: "GET", handler },
      { url: "/a/b", method: "GET", handler },
      { type: "redirect", from: "/a/b", to: "/a/c", handler }
    ]);
    router.routes.length.should.equal(4);
  });


  ["get", "post", "del", "put", "patch"].forEach((method) => {
    it(`Adds a ${method.toUpperCase()} route`, () => {
      const router = new Router();
      const handler = async (req, res) => {};
      router[method.toLowerCase()]("/a", handler);
      router.routes.length.should.equal(1);
      router.routes[0].method.should.equal(method !== "del" ? method.toUpperCase() : "DELETE");
      router.routes[0].should.be.instanceOf(HttpMethodRoute);
    });
  });


  it(`Adds a redirect`, () => {
    const router = new Router();
    router.redirect("/a", "/b", 301);
    router.routes.length.should.equal(1);
    router.routes[0].should.be.instanceOf(RedirectRoute);
  });


  it(`doRouting() returns a promise`, () => {
    const router = new Router();
    const handler = async (req, res) => {};
    router.get("/a", handler)
    const req = {
      url: "/a",
      method: "GET"
    };
    const res = new stream.Writable();
    res.end = res.write = res.writeHead = () => {}; //Mock these...
    const p = router.doRouting(req, res);
    p.should.be.instanceOf(Promise);
  });


  it(`can try-catch handler errors`, async () => {
    const router = new Router();
    const handler = async (req, res) => { throw "BOOM!"; };
    router.get("/a", handler)
    const req = {
      url: "/a",
      method: "GET"
    };
    const res = new stream.Writable();
    res.end = res.write = res.writeHead = () => {}; //Mock these...
    let error;
    try {
      await router.doRouting(req, res);
    } catch (e) {
      error = e;
    }
    error.should.equal("BOOM!")
  });


  it(`Must add a predicate`, () => {
    const router = new Router();
    const handler = async (req, res) => {};
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

  const testTypes = ["Mock", "http.Server"];

  for (let testType of testTypes) {
    for (let r of urlData) {
      const strArgs = r.arguments && r.arguments.length ?
      ` and capture ${(r.argumentsAsObject ?`${r.arguments} as Object` : `${r.arguments}`)}` :
      ``;

      it(`${testType} ${r.request.method} ${r.request.url} ${r.match ? "matches" : "does not match"} route { url: "${r.route.url}", method: "${r.route.method}" }${strArgs}`, async () => {
        r.arguments = r.arguments || [];

        const router = new Router();
        let called = false;

        let handlerArgs = [];

        const handler = async function(req, res) {
          handlerArgs = Array.prototype.slice.call(arguments);
          called = true;
          res.end();
        };

        const methodName = r.route.method.toLowerCase() === "delete" ? "del" : r.route.method.toLowerCase();
        router[methodName](r.route.url, handler, { argumentsAsObject: r.argumentsAsObject });

        //Do Tests for "Mocks"
        if (testType === "Mock") {
          const req = {
            url: r.request.url,
            method: r.request.method.toUpperCase()
          };
          const res = new stream.Writable();
          res.end = res.write = res.writeHead = () => {}; //Mock these...
          await router.doRouting(req, res);
        }

        //Do tests for http.Server
        if ((testType === "http.Server")) {
          const server = http.createServer((req, res) => { router.doRouting(req, res); });
          const listen = promisify(server.listen.bind(server));
          await listen(0);
          const result = await makeRequest("localhost", server.address().port, r.request.url, r.request.method, { 'Content-Type': 'application/x-www-form-urlencoded' });

          if (!r.match) {
            result.res.statusCode.should.equal(404);
          }
        }

        //See if all OK
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
          const arg = handlerArgs[2];
          r.paramNames.forEach((p, i) => {
            p.should.equal(router.routes[0].keys[i].name);
            arg[p].should.equal(r.arguments[i]);
          });
        } else {
          r.arguments.forEach((a, i) => {
            a.should.equal(handlerArgs[i + 2]);
          });
        }
      })
    }
  }


  it(`Doesn't call the second handler if the first one has already handled the request.`, async () => {
    let called = false;
    let handlerArgs = [];
    let called2 = false;
    let handlerArgs2 = [];

    const handler = async function(req, res) {
      handlerArgs = Array.prototype.slice.call(arguments);
      called = true;
      res.end();
    };

    const handler2 = async function(req, res) {
      handlerArgs2 = Array.prototype.slice.call(arguments);
      called2 = true;
      res.end();
    };

    const router = new Router();
    router.get("/a1", handler);
    router.get("/a1", handler2);

    const server = http.createServer((req, res) => { router.doRouting(req, res); });
    const listen = promisify(server.listen.bind(server));
    await listen(0);
    await makeRequest("localhost", server.address().port, "/a1", "GET", { 'Content-Type': 'application/x-www-form-urlencoded' }, {});
    called.should.be.true();
    called2.should.be.false();
  });


  it(`Mounts a second router`, async () => {
    let called = false;
    let handlerArgs = [];
    let called2 = false;
    let handlerArgs2 = [];

    const handler = async function(req, res) {
      handlerArgs = Array.prototype.slice.call(arguments);
      called = true;
      res.end();
    };

    const handler2 = async function(req, res) {
      handlerArgs2 = Array.prototype.slice.call(arguments);
      called2 = true;
      res.end();
    };

    const router = new Router();
    router.get("/a1", handler);
    const subRouter = new Router();
    subRouter.get("/", handler2);
    router.mount("/a1", subRouter);

    const server = http.createServer((req, res) => { router.doRouting(req, res); });
    const listen = promisify(server.listen.bind(server));
    await listen(0);
    await makeRequest("localhost", server.address().port, "/a1", "GET", { 'Content-Type': 'application/x-www-form-urlencoded' }, {});
    called.should.be.false();
    called2.should.be.true();
  });


  it(`Calls error handler on child and parent routers`, async () => {
    const handler = async function(req, res) {};
    const handler2 = async function(req, res) {
      throw "BOMB!";
    };

    let outerErrorHandlerCalled = false;
    const outerErrorHandler = (req, res, e) => { outerErrorHandlerCalled = true; }

    let innerErrorHandlerCalled = false;
    const innerErrorHandler = (req, res, e) => { innerErrorHandlerCalled = true; res.end("error!"); }

    const router = new Router({ onError: outerErrorHandler });
    router.get("/a1", handler);
    const subRouter = new Router({ onError: innerErrorHandler });
    subRouter.get("/", handler2);
    router.mount("/a1", subRouter);

    const server = http.createServer((req, res) => { router.doRouting(req, res); });
    const listen = promisify(server.listen.bind(server));
    await listen(0);
    await makeRequest("localhost", server.address().port, "/a1", "GET", { 'Content-Type': 'application/x-www-form-urlencoded' }, {});
    innerErrorHandlerCalled.should.be.true();
    outerErrorHandlerCalled.should.be.true();
  });


  it(`Mounts a third router`, async () => {
    let called = false;
    let handlerArgs = [];
    let called2 = false;
    let handlerArgs2 = [];
    let called3 = false;
    let handlerArgs3 = [];

    const handler = async function(req, res) {
      handlerArgs = Array.prototype.slice.call(arguments);
      called = true;
      res.end();
    };

    const handler2 = async function(req, res) {
      handlerArgs2 = Array.prototype.slice.call(arguments);
      called2 = true;
      res.end();
    };

    const handler3 = async function(req, res) {
      handlerArgs3 = Array.prototype.slice.call(arguments);
      called3 = true;
      res.end();
    };

    const router = new Router();
    router.get("/a1", handler);
    const subRouter = new Router();
    subRouter.get("/", handler2);
    router.mount("/a1", subRouter);
    const subSubRouter = new Router();
    subSubRouter.get("/", handler3);
    subRouter.mount("/a1", subSubRouter);

    const server = http.createServer((req, res) => { router.doRouting(req, res); });
    const listen = promisify(server.listen.bind(server));
    await listen(0);
    await makeRequest("localhost", server.address().port, "/a1/a1", "GET", { 'Content-Type': 'application/x-www-form-urlencoded' }, {});
    called.should.be.false();
    called2.should.be.false();
    called3.should.be.true();
  });

});
