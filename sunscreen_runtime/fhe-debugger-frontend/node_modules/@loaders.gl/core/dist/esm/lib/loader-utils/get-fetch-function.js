import { isObject } from '../../javascript-utils/is-type';
import { fetchFile } from '../fetch/fetch-file';
import { getGlobalLoaderOptions } from './option-utils';
export function getFetchFunction(options, context) {
  const globalOptions = getGlobalLoaderOptions();
  const fetchOptions = options || globalOptions;
  if (typeof fetchOptions.fetch === 'function') {
    return fetchOptions.fetch;
  }
  if (isObject(fetchOptions.fetch)) {
    return url => fetchFile(url, fetchOptions);
  }
  if (context !== null && context !== void 0 && context.fetch) {
    return context === null || context === void 0 ? void 0 : context.fetch;
  }
  return fetchFile;
}
//# sourceMappingURL=get-fetch-function.js.map