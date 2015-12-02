/* @flow */
import pathToRegexp from "path-to-regexp";

export default class RedirectRoute {
    re: RegExp;
    from: string;
    to: string;
    code: number;

    constructor(fromUrl: string, toUrl: string, code: number = 301) {
        this.from = fromUrl;
        this.to = toUrl;
        this.code = code;
        this.re = pathToRegexp(fromUrl);
    }

    async handle(context: ContextType) : Promise<HandleResultType> {
        if (context.path !== "") {
            const m = this.re.exec(context.path);
            if (m) {
                context.code = this.code || 301;
                context.redirect(this.to);
            }
        }
        return { keepChecking: false };
    }
}
