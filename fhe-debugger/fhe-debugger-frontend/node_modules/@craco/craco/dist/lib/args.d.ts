export interface CliArgs {
    [key: string]: string | boolean;
}
export interface CliArgSpec {
    [key: string]: {
        arg: string;
        value: boolean;
    };
}
export declare function getArgs(): CliArgs;
export declare function setArgs(values?: CliArgs): void;
export declare function findArgsFromCli(): void;
