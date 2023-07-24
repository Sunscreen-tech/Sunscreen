import { parseCrunch } from '../lib/parsers/parse-crunch';
/**
 * Loader for the Crunch compressed texture container format
 */
export declare const CrunchLoaderWithParser: {
    parse: typeof parseCrunch;
    id: string;
    name: string;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    binary: boolean;
    options: {
        crunch: {
            libraryPath: string;
        };
    };
};
//# sourceMappingURL=crunch-worker.d.ts.map