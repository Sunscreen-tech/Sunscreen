import { resolvePath } from '@loaders.gl/loader-utils';
import { makeResponse } from '../utils/response-utils';
export async function fetchFile(url, options) {
  if (typeof url === 'string') {
    url = resolvePath(url);
    let fetchOptions = options;
    if (options !== null && options !== void 0 && options.fetch && typeof (options === null || options === void 0 ? void 0 : options.fetch) !== 'function') {
      fetchOptions = options.fetch;
    }
    return await fetch(url, fetchOptions);
  }
  return await makeResponse(url);
}
//# sourceMappingURL=fetch-file.js.map