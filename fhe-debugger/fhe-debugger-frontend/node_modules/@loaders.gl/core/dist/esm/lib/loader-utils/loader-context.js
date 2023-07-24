import { getFetchFunction } from './get-fetch-function';
import { extractQueryString, stripQueryString } from '../utils/url-utils';
import { path } from '@loaders.gl/loader-utils';
export function getLoaderContext(context, options, parentContext) {
  if (parentContext) {
    return parentContext;
  }
  const newContext = {
    fetch: getFetchFunction(options, context),
    ...context
  };
  if (newContext.url) {
    const baseUrl = stripQueryString(newContext.url);
    newContext.baseUrl = baseUrl;
    newContext.queryString = extractQueryString(newContext.url);
    newContext.filename = path.filename(baseUrl);
    newContext.baseUrl = path.dirname(baseUrl);
  }
  if (!Array.isArray(newContext.loaders)) {
    newContext.loaders = null;
  }
  return newContext;
}
export function getLoadersFromContext(loaders, context) {
  if (!context && loaders && !Array.isArray(loaders)) {
    return loaders;
  }
  let candidateLoaders;
  if (loaders) {
    candidateLoaders = Array.isArray(loaders) ? loaders : [loaders];
  }
  if (context && context.loaders) {
    const contextLoaders = Array.isArray(context.loaders) ? context.loaders : [context.loaders];
    candidateLoaders = candidateLoaders ? [...candidateLoaders, ...contextLoaders] : contextLoaders;
  }
  return candidateLoaders && candidateLoaders.length ? candidateLoaders : null;
}
//# sourceMappingURL=loader-context.js.map