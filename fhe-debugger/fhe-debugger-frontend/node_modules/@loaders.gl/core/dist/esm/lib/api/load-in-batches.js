import { isLoaderObject } from '../loader-utils/normalize-loader';
import { getFetchFunction } from '../loader-utils/get-fetch-function';
import { parseInBatches } from './parse-in-batches';
export function loadInBatches(files, loaders, options, context) {
  if (!Array.isArray(loaders) && !isLoaderObject(loaders)) {
    context = undefined;
    options = loaders;
    loaders = null;
  }
  const fetch = getFetchFunction(options || {});
  if (!Array.isArray(files)) {
    return loadOneFileInBatches(files, loaders, options, fetch);
  }
  const promises = files.map(file => loadOneFileInBatches(file, loaders, options, fetch));
  return promises;
}
async function loadOneFileInBatches(file, loaders, options, fetch) {
  if (typeof file === 'string') {
    const url = file;
    const response = await fetch(url);
    return await parseInBatches(response, loaders, options);
  }
  return await parseInBatches(file, loaders, options);
}
//# sourceMappingURL=load-in-batches.js.map