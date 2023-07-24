"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInBatches = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const normalize_loader_1 = require("../loader-utils/normalize-loader");
const option_utils_1 = require("../loader-utils/option-utils");
const loader_context_1 = require("../loader-utils/loader-context");
const get_data_1 = require("../loader-utils/get-data");
const resource_utils_1 = require("../utils/resource-utils");
const select_loader_1 = require("./select-loader");
// Ensure `parse` is available in context if loader falls back to `parse`
const parse_1 = require("./parse");
/**
 * Parses `data` using a specified loader
 * @param data
 * @param loaders
 * @param options
 * @param context
 */
async function parseInBatches(data, loaders, options, context) {
    (0, loader_utils_1.assert)(!context || typeof context === 'object'); // parseInBatches no longer accepts final url
    const loaderArray = Array.isArray(loaders) ? loaders : undefined;
    // Signature: parseInBatches(data, options, url) - Uses registered loaders
    if (!Array.isArray(loaders) && !(0, normalize_loader_1.isLoaderObject)(loaders)) {
        context = undefined; // context not supported in short signature
        options = loaders;
        loaders = undefined;
    }
    data = await data; // Resolve any promise
    options = options || {};
    // Extract a url for auto detection
    const url = (0, resource_utils_1.getResourceUrl)(data);
    // Chooses a loader and normalizes it
    // Note - only uses URL and contentType for streams and iterator inputs
    const loader = await (0, select_loader_1.selectLoader)(data, loaders, options);
    // Note: if options.nothrow was set, it is possible that no loader was found, if so just return null
    if (!loader) {
        // @ts-ignore
        return null;
    }
    // Normalize options
    options = (0, option_utils_1.normalizeOptions)(options, loader, loaderArray, url);
    context = (0, loader_context_1.getLoaderContext)({ url, parseInBatches, parse: parse_1.parse, loaders: loaderArray }, options, context || null);
    return await parseWithLoaderInBatches(loader, data, options, context);
}
exports.parseInBatches = parseInBatches;
/**
 * Loader has been selected and context has been prepared, see if we need to emit a metadata batch
 */
async function parseWithLoaderInBatches(loader, data, options, context) {
    const outputIterator = await parseToOutputIterator(loader, data, options, context);
    // Generate metadata batch if requested
    if (!options.metadata) {
        return outputIterator;
    }
    const metadataBatch = {
        batchType: 'metadata',
        metadata: {
            _loader: loader,
            _context: context
        },
        // Populate with some default fields to avoid crashing
        data: [],
        bytesUsed: 0
    };
    async function* makeMetadataBatchIterator(iterator) {
        yield metadataBatch;
        yield* iterator;
    }
    return makeMetadataBatchIterator(outputIterator);
}
/**
 * Prep work is done, now it is time to start parsing into an output operator
 * The approach depends on which parse function the loader exposes
 * `parseInBatches` (preferred), `parse` (fallback)
 */
async function parseToOutputIterator(loader, data, options, context) {
    // Get an iterator from the input
    const inputIterator = await (0, get_data_1.getAsyncIterableFromData)(data, options);
    // Apply any iterator transforms (options.transforms)
    const transformedIterator = await applyInputTransforms(inputIterator, options?.transforms || []);
    // If loader supports parseInBatches, we are done
    if (loader.parseInBatches) {
        return loader.parseInBatches(transformedIterator, options, context);
    }
    // Fallback: load atomically using `parse` concatenating input iterator into single chunk
    async function* parseChunkInBatches() {
        const arrayBuffer = await (0, loader_utils_1.concatenateArrayBuffersAsync)(transformedIterator);
        // Call `parse` instead of `loader.parse` to ensure we can call workers etc.
        const parsedData = await (0, parse_1.parse)(arrayBuffer, loader, 
        // TODO - Hack: supply loaders MIME type to ensure we match it
        { ...options, mimeType: loader.mimeTypes[0] }, context);
        // yield a single batch, the output from loader.parse()
        // TODO - run through batch builder to apply options etc...
        const batch = {
            mimeType: loader.mimeTypes[0],
            shape: Array.isArray(parsedData) ? 'row-table' : 'unknown',
            batchType: 'data',
            data: parsedData,
            length: Array.isArray(parsedData) ? parsedData.length : 1
        };
        yield batch;
    }
    return parseChunkInBatches();
}
/**
 * Create an iterator chain with any transform iterators (crypto, decompression)
 * @param inputIterator
 * @param options
 */
async function applyInputTransforms(inputIterator, transforms = []) {
    let iteratorChain = inputIterator;
    for await (const transformBatches of transforms) {
        iteratorChain = transformBatches(iteratorChain);
    }
    return iteratorChain;
}
