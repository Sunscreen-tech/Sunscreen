export interface ICLIArgs {
    input: string;
    output: string;
    type: string;
    compression: string;
    quality: string;
    mipmap?: boolean;
    flipY?: boolean;
    square?: string;
    pot?: string;
    flags?: string[] | null;
    verbose?: boolean;
}
export declare const CLIArgs: ICLIArgs;
