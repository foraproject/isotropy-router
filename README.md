isotropy-router
===============
A router for koa with an ES7 async/await (or promises) based API.

Usage
-----

Install it via npm
```
npm install isotropy-router
```

Use it with koa
```
const app = new koa();
const router = new Router();
const handler = async (context) => { context.body = "hello, world"; };

router.get("/hello", handler);
app.use((context, next) => router.doRouting(context, next));
app.listen();
```

You can see more examples in the test/ directory.

API
---
### What is context?
It is the koa context, containing the request and response objects.
Details here: https://github.com/koajs/koa/blob/master/docs/api/context.md

### get(), post(), del(), put() and patch()
In the following example, a GET request to /users/100 calls handler with id=100 as an argument.
```
const router = new Router();
const handler = async (context, id) => { context.body = "hello, user #" + id; };
router.get("/users/:id", handler);
```

### redirect()
In the following example, a request to /hello is redirected to /world
```
const router = new Router();
router.redirect("/hello", "/world");    
router.redirect("/one", "/two", 301); //Set the response code, defaults to 301
```

### when()
When allows you to pass the request to a handler if the request matches a predicate.
```
const router = new Router();
const handler = async (context) => { context.body = "hello, world"; };
router.when((context) => { return /^\/hello/.test(context.path); }, handler);
```

### add()
Add a bunch of routes together, instead of calling get(), put(), when() etc separately.
```
router.add([
    { method: "get", url: "/hello", handler: someHandler },
    { method: "get", url: "/world/:id", handler: someOtherHandler },
    { type: "redirect", from: "/hello", to: "/world", code: 301 },
    { type: "predicate", predicate: somePredicate, handler: someHandler }
]);
```

Advanced API
------------
### beforeRouting()
Add an event handler that executes before the router starts processing a request.
```
const router = new Router();
const handler = async (context) => { context.body = "hello, world"; };
router.beforeRouting((context, next) => { /* do something here... like logging */ });
```

### afterRouting()
Add an event handler that executes after the router processes a request.
```
const router = new Router();
const handler = async (context) => { context.body = "hello, world"; };
router.afterRouting((context, next) => { /* do something here... like logging */ });
```
