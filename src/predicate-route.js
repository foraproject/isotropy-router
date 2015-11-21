/* @flow */
export default class PredicateRoute {
    predicate: PredicateType;
    handler: HandlerType;

    constructor(predicate: PredicateType, handler: HandlerType) {
        this.predicate = predicate;
        this.handler = handler;
    }

    async handle(context: ContextType) : Promise {
        if (this.predicate(context)) {
            return await this.handler(context);
        }
    }
}
