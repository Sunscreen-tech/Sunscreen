import type { LoaderWithParser } from '@loaders.gl/loader-utils';
import type { XMLLoaderOptions } from '@loaders.gl/xml';
import type { WMSFeatureInfo } from '../lib/parsers/wms/parse-wms-features';
export { WMSFeatureInfo };
/**
 * Loader for the response to the WMS GetFeatureInfo request
 */
export declare const WMSFeatureInfoLoader: {
    id: string;
    name: string;
    parse: (arrayBuffer: ArrayBuffer, options?: XMLLoaderOptions) => Promise<WMSFeatureInfo>;
    parseTextSync: (text: string, options?: XMLLoaderOptions) => WMSFeatureInfo;
    module: string;
    version: any;
    worker: boolean;
    extensions: string[];
    mimeTypes: string[];
    testText: (text: string) => boolean;
    options: {
        wms: {};
    };
};
export declare const _typecheckWMSFeatureInfoLoader: LoaderWithParser;
//# sourceMappingURL=wms-feature-info-loader.d.ts.map