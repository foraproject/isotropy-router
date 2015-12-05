type PathToRegExpKeyType = {
    name: string,
    prefix: string,
    delimiter: string,
    optional: boolean,
    repeat: boolean,
    pattern: string
};

declare module "path-to-regexp" {
    declare function exports(pattern: string) : RegExp
}
