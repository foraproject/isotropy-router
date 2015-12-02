/* @flow */
export default class PredicateRoute {
    predicate: PredicateType;
    handler: HandlerType;

    constructor(predicate: PredicateType, handler: HandlerType) {
        this.predicate = predicate;
        this.handler = handler;
    }

    async handle(context: ContextType) : Promise<HandleResultType> {
        return this.predicate(context) ?
            { keepChecking: (await this.handler(context)) } :
            { keepChecking: true };
    }
}
