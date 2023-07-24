import type { LoaderWithParser } from '@loaders.gl/loader-utils';
import type { XMLLoaderOptions } from '@loaders.gl/xml';
import type { WMSLayerDescription } from '../lib/parsers/wms/parse-wms-layer-description';
export { WMSLayerDescription };
/**
 * Loader for the response to the WMS DescribeLayer request
 */
export declare const WMSLayerDescriptionLoader: {
    id: string;
    name: string;
    parse: (arrayBuffer: ArrayBuffer, options?: XMLLoaderOptions) => Promise<WMSLayerDescription>;
    parseTextSync: (text: string, options?: XMLLoaderOptions) => WMSLayerDescription;
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
//# sourceMappingURL=wms-layer-description-loader.d.ts.map