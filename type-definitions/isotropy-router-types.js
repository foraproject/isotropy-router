type ContextType = { code: number, redirect: (url: string) => void, method: string, path: string };
type HandlerType = () => Promise;
type PredicateType = (context: ContextType) => bool;
