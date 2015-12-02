type NextType = () => Promise;

type ContextType = {
    code: number,
    redirect: (url: string) => void,
    method: string,
    path: string,
    status: number
};

type MiddlewareType = (context: ContextType, next: NextType) => Promise;

type HandlerType = () => Promise;

type PredicateType = (context: ContextType) => bool;

type RouteHandlerResultType = {
    keepChecking: boolean,
    keys?: Array<PathToRegExpKeyType>,
    args?: Array<string>,
    result?: any
};
