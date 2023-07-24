import { normalizeLoader } from '../loader-utils/normalize-loader';
import { getGlobalLoaderState } from '../loader-utils/option-utils';
const getGlobalLoaderRegistry = () => {
  const state = getGlobalLoaderState();
  state.loaderRegistry = state.loaderRegistry || [];
  return state.loaderRegistry;
};
export function registerLoaders(loaders) {
  const loaderRegistry = getGlobalLoaderRegistry();
  loaders = Array.isArray(loaders) ? loaders : [loaders];
  for (const loader of loaders) {
    const normalizedLoader = normalizeLoader(loader);
    if (!loaderRegistry.find(registeredLoader => normalizedLoader === registeredLoader)) {
      loaderRegistry.unshift(normalizedLoader);
    }
  }
}
export function getRegisteredLoaders() {
  return getGlobalLoaderRegistry();
}
export function _unregisterLoaders() {
  const state = getGlobalLoaderState();
  state.loaderRegistry = [];
}
//# sourceMappingURL=register-loaders.js.map