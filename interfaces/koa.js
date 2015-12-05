declare module "koa" {
    declare function KoaNextType() : Promise;

    declare type KoaContextType = {
        code: number;
        redirect: (url: string) => void;
        method: string;
        path: string;
        status: number;
    }

    declare function KoaMiddlewareType(context: KoaContextType, next: KoaNextType) : Promise;

    declare type KoaHandlerType = () => Promise;
}
