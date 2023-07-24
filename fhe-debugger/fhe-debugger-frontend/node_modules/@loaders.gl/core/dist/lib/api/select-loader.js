"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectLoaderSync = exports.selectLoader = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const normalize_loader_1 = require("../loader-utils/normalize-loader");
const log_1 = require("../utils/log");
const resource_utils_1 = require("../utils/resource-utils");
const register_loaders_1 = require("./register-loaders");
const is_type_1 = require("../../javascript-utils/is-type");
const url_utils_1 = require("../utils/url-utils");
const EXT_PATTERN = /\.([^.]+)$/;
// TODO - Need a variant that peeks at streams for parseInBatches
// TODO - Detect multiple matching loaders? Use heuristics to grade matches?
// TODO - Allow apps to pass context to disambiguate between multiple matches (e.g. multiple .json formats)?
/**
 * Find a loader that matches file extension and/or initial file content
 * Search the loaders array argument for a loader that matches url extension or initial data
 * Returns: a normalized loader
 * @param data data to assist
 * @param loaders
 * @param options
 * @param context used internally, applications should not provide this parameter
 */
async function selectLoader(data, loaders = [], options, context) {
    if (!validHTTPResponse(data)) {
        return null;
    }
    // First make a sync attempt, disabling exceptions
    let loader = selectLoaderSync(data, loaders, { ...options, nothrow: true }, context);
    if (loader) {
        return loader;
    }
    // For Blobs and Files, try to asynchronously read a small initial slice and test again with that
    // to see if we can detect by initial content
    if ((0, is_type_1.isBlob)(data)) {
        data = await data.slice(0, 10).arrayBuffer();
        loader = selectLoaderSync(data, loaders, options, context);
    }
    // no loader available
    if (!loader && !options?.nothrow) {
        throw new Error(getNoValidLoaderMessage(data));
    }
    return loader;
}
exports.selectLoader = selectLoader;
/**
 * Find a loader that matches file extension and/or initial file content
 * Search the loaders array argument for a loader that matches url extension or initial data
 * Returns: a normalized loader
 * @param data data to assist
 * @param loaders
 * @param options
 * @param context used internally, applications should not provide this parameter
 */
function selectLoaderSync(data, loaders = [], options, context) {
    if (!validHTTPResponse(data)) {
        return null;
    }
    // eslint-disable-next-line complexity
    // if only a single loader was provided (not as array), force its use
    // TODO - Should this behavior be kept and documented?
    if (loaders && !Array.isArray(loaders)) {
        // TODO - remove support for legacy loaders
        return (0, normalize_loader_1.normalizeLoader)(loaders);
    }
    // Build list of candidate loaders that will be searched in order for a match
    let candidateLoaders = [];
    // First search supplied loaders
    if (loaders) {
        candidateLoaders = candidateLoaders.concat(loaders);
    }
    // Then fall back to registered loaders
    if (!options?.ignoreRegisteredLoaders) {
        candidateLoaders.push(...(0, register_loaders_1.getRegisteredLoaders)());
    }
    // TODO - remove support for legacy loaders
    normalizeLoaders(candidateLoaders);
    const loader = selectLoaderInternal(data, candidateLoaders, options, context);
    // no loader available
    if (!loader && !options?.nothrow) {
        throw new Error(getNoValidLoaderMessage(data));
    }
    return loader;
}
exports.selectLoaderSync = selectLoaderSync;
/** Implements loaders selection logic */
// eslint-disable-next-line complexity
function selectLoaderInternal(data, loaders, options, context) {
    const url = (0, resource_utils_1.getResourceUrl)(data);
    const type = (0, resource_utils_1.getResourceMIMEType)(data);
    const testUrl = (0, url_utils_1.stripQueryString)(url) || context?.url;
    let loader = null;
    let reason = '';
    // if options.mimeType is supplied, it takes precedence
    if (options?.mimeType) {
        loader = findLoaderByMIMEType(loaders, options?.mimeType);
        reason = `match forced by supplied MIME type ${options?.mimeType}`;
    }
    // Look up loader by url
    loader = loader || findLoaderByUrl(loaders, testUrl);
    reason = reason || (loader ? `matched url ${testUrl}` : '');
    // Look up loader by mime type
    loader = loader || findLoaderByMIMEType(loaders, type);
    reason = reason || (loader ? `matched MIME type ${type}` : '');
    // Look for loader via initial bytes (Note: not always accessible (e.g. Response, stream, async iterator)
    loader = loader || findLoaderByInitialBytes(loaders, data);
    reason = reason || (loader ? `matched initial data ${getFirstCharacters(data)}` : '');
    // Look up loader by fallback mime type
    loader = loader || findLoaderByMIMEType(loaders, options?.fallbackMimeType);
    reason = reason || (loader ? `matched fallback MIME type ${type}` : '');
    if (reason) {
        log_1.log.log(1, `selectLoader selected ${loader?.name}: ${reason}.`);
    }
    return loader;
}
/** Check HTTP Response */
function validHTTPResponse(data) {
    // HANDLE HTTP status
    if (data instanceof Response) {
        // 204 - NO CONTENT. This handles cases where e.g. a tile server responds with 204 for a missing tile
        if (data.status === 204) {
            return false;
        }
    }
    return true;
}
/** Generate a helpful message to help explain why loader selection failed. */
function getNoValidLoaderMessage(data) {
    const url = (0, resource_utils_1.getResourceUrl)(data);
    const type = (0, resource_utils_1.getResourceMIMEType)(data);
    let message = 'No valid loader found (';
    message += url ? `${loader_utils_1.path.filename(url)}, ` : 'no url provided, ';
    message += `MIME type: ${type ? `"${type}"` : 'not provided'}, `;
    // First characters are only accessible when called on data (string or arrayBuffer).
    const firstCharacters = data ? getFirstCharacters(data) : '';
    message += firstCharacters ? ` first bytes: "${firstCharacters}"` : 'first bytes: not available';
    message += ')';
    return message;
}
function normalizeLoaders(loaders) {
    for (const loader of loaders) {
        (0, normalize_loader_1.normalizeLoader)(loader);
    }
}
// TODO - Would be nice to support http://example.com/file.glb?parameter=1
// E.g: x = new URL('http://example.com/file.glb?load=1'; x.pathname
function findLoaderByUrl(loaders, url) {
    // Get extension
    const match = url && EXT_PATTERN.exec(url);
    const extension = match && match[1];
    return extension ? findLoaderByExtension(loaders, extension) : null;
}
function findLoaderByExtension(loaders, extension) {
    extension = extension.toLowerCase();
    for (const loader of loaders) {
        for (const loaderExtension of loader.extensions) {
            if (loaderExtension.toLowerCase() === extension) {
                return loader;
            }
        }
    }
    return null;
}
function findLoaderByMIMEType(loaders, mimeType) {
    for (const loader of loaders) {
        if (loader.mimeTypes && loader.mimeTypes.includes(mimeType)) {
            return loader;
        }
        // Support referring to loaders using the "unregistered tree"
        // https://en.wikipedia.org/wiki/Media_type#Unregistered_tree
        if (mimeType === `application/x.${loader.id}`) {
            return loader;
        }
    }
    return null;
}
function findLoaderByInitialBytes(loaders, data) {
    if (!data) {
        return null;
    }
    for (const loader of loaders) {
        if (typeof data === 'string') {
            if (testDataAgainstText(data, loader)) {
                return loader;
            }
        }
        else if (ArrayBuffer.isView(data)) {
            // Typed Arrays can have offsets into underlying buffer
            if (testDataAgainstBinary(data.buffer, data.byteOffset, loader)) {
                return loader;
            }
        }
        else if (data instanceof ArrayBuffer) {
            const byteOffset = 0;
            if (testDataAgainstBinary(data, byteOffset, loader)) {
                return loader;
            }
        }
        // TODO Handle streaming case (requires creating a new AsyncIterator)
    }
    return null;
}
function testDataAgainstText(data, loader) {
    if (loader.testText) {
        return loader.testText(data);
    }
    const tests = Array.isArray(loader.tests) ? loader.tests : [loader.tests];
    return tests.some((test) => data.startsWith(test));
}
function testDataAgainstBinary(data, byteOffset, loader) {
    const tests = Array.isArray(loader.tests) ? loader.tests : [loader.tests];
    return tests.some((test) => testBinary(data, byteOffset, loader, test));
}
function testBinary(data, byteOffset, loader, test) {
    if (test instanceof ArrayBuffer) {
        return (0, loader_utils_1.compareArrayBuffers)(test, data, test.byteLength);
    }
    switch (typeof test) {
        case 'function':
            return test(data, loader);
        case 'string':
            // Magic bytes check: If `test` is a string, check if binary data starts with that strings
            const magic = getMagicString(data, byteOffset, test.length);
            return test === magic;
        default:
            return false;
    }
}
function getFirstCharacters(data, length = 5) {
    if (typeof data === 'string') {
        return data.slice(0, length);
    }
    else if (ArrayBuffer.isView(data)) {
        // Typed Arrays can have offsets into underlying buffer
        return getMagicString(data.buffer, data.byteOffset, length);
    }
    else if (data instanceof ArrayBuffer) {
        const byteOffset = 0;
        return getMagicString(data, byteOffset, length);
    }
    return '';
}
function getMagicString(arrayBuffer, byteOffset, length) {
    if (arrayBuffer.byteLength < byteOffset + length) {
        return '';
    }
    const dataView = new DataView(arrayBuffer);
    let magic = '';
    for (let i = 0; i < length; i++) {
        magic += String.fromCharCode(dataView.getUint8(byteOffset + i));
    }
    return magic;
}
