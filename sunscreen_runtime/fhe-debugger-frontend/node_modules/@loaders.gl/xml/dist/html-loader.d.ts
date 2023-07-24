import type { LoaderWithParser } from '@loaders.gl/loader-utils';
import { XMLLoaderOptions } from './xml-loader';
export type HTMLLoaderOptions = XMLLoaderOptions;
/**
 * Loader for HTML files
 * Essentially a copy of the XMLLoader with different mime types, file extensions and content tests.
 * This split enables applications can control whether they want HTML responses to be parsed by the XML loader or not.
 * This loader does not have any additional understanding of the structure of HTML or the document.
 */
export declare const HTMLLoader: LoaderWithParser;
//# sourceMappingURL=html-loader.d.ts.map