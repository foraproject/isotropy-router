/* @flow */
export default class PredicateRoute {
    predicate: PredicateType;
    handler: HandlerType;

    constructor(predicate: PredicateType, handler: HandlerType) {
        this.predicate = predicate;
        this.handler = handler;
    }

    async handle(context: ContextType) : Promise<HandleResultType> {
        if (this.predicate(context)) {
            await this.handler(context);
            return { keepChecking: false };
        } else {
            return { keepChecking: true };
        }
    }
}
