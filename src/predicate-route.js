/* @flow */
import type { IncomingMessage, ServerResponse } from "./flow/http";
import type { RouteHandlerType, RouteHandlerResultType } from "./isotropy-router";

export type PredicateType = (req: IncomingMessage, res: ServerResponse) => bool;

export default class PredicateRoute {
  predicate: PredicateType;
  handler: RouteHandlerType;

  constructor(predicate: PredicateType, handler: RouteHandlerType) {
    this.predicate = predicate;
    this.handler = handler;
  }

  async handle(req: IncomingMessage, res: ServerResponse) : Promise<RouteHandlerResultType> {
    if (this.predicate(req, res)) {
      await this.handler(req, res);
      return { handled: true };
    } else {
      return { handled: false };
    }
  }
}
