import { assert } from '@loaders.gl/loader-utils';
import { selectLoaderSync } from './select-loader';
import { isLoaderObject } from '../loader-utils/normalize-loader';
import { normalizeOptions } from '../loader-utils/option-utils';
import { getArrayBufferOrStringFromDataSync } from '../loader-utils/get-data';
import { getLoaderContext, getLoadersFromContext } from '../loader-utils/loader-context';
import { getResourceUrl } from '../utils/resource-utils';
export function parseSync(data, loaders, options, context) {
  assert(!context || typeof context === 'object');
  if (!Array.isArray(loaders) && !isLoaderObject(loaders)) {
    context = undefined;
    options = loaders;
    loaders = undefined;
  }
  options = options || {};
  const typedLoaders = loaders;
  const candidateLoaders = getLoadersFromContext(typedLoaders, context);
  const loader = selectLoaderSync(data, candidateLoaders, options);
  if (!loader) {
    return null;
  }
  options = normalizeOptions(options, loader, candidateLoaders);
  const url = getResourceUrl(data);
  const parse = () => {
    throw new Error('parseSync called parse (which is async');
  };
  context = getLoaderContext({
    url,
    parseSync,
    parse,
    loaders: loaders
  }, options, context || null);
  return parseWithLoaderSync(loader, data, options, context);
}
function parseWithLoaderSync(loader, data, options, context) {
  data = getArrayBufferOrStringFromDataSync(data, loader, options);
  if (loader.parseTextSync && typeof data === 'string') {
    return loader.parseTextSync(data, options);
  }
  if (loader.parseSync && data instanceof ArrayBuffer) {
    return loader.parseSync(data, options, context);
  }
  throw new Error("".concat(loader.name, " loader: 'parseSync' not supported by this loader, use 'parse' instead. ").concat(context.url || ''));
}
//# sourceMappingURL=parse-sync.js.map