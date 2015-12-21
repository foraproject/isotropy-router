/* @flow */
import type { KoaHandlerType, KoaContextType } from "./flow/koa-types";
import type { RouteHandlerResultType } from "./isotropy-router";

export type PredicateType = (context: KoaContextType) => bool;

export default class PredicateRoute {
    predicate: PredicateType;
    handler: KoaHandlerType;

    constructor(predicate: PredicateType, handler: KoaHandlerType) {
        this.predicate = predicate;
        this.handler = handler;
    }

    async handle(context: KoaContextType) : Promise<RouteHandlerResultType> {
        if (this.predicate(context)) {
            await this.handler(context);
            return { keepChecking: false };
        } else {
            return { keepChecking: true };
        }
    }
}
