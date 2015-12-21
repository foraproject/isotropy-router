declare module "path-to-regexp" {
    declare type PathToRegExpKeyType = {
        name: string,
        prefix: string,
        delimiter: string,
        optional: boolean,
        repeat: boolean,
        pattern: string
    }

    declare function exports(pattern: string) : RegExp
}
