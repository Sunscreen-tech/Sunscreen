export function getFetchFunction(options) {
  const fetchFunction = options === null || options === void 0 ? void 0 : options.fetch;
  if (fetchFunction && typeof fetchFunction === 'function') {
    return (url, fetchOptions) => fetchFunction(url, fetchOptions);
  }
  const fetchOptions = options === null || options === void 0 ? void 0 : options.fetch;
  if (fetchOptions && typeof fetchOptions !== 'function') {
    return url => fetch(url, fetchOptions);
  }
  return url => fetch(url);
}
export function mergeImageServiceProps(props) {
  return {
    ...props,
    loadOptions: {
      ...props.loadOptions,
      fetch: getFetchFunction(props.loadOptions)
    }
  };
}
//# sourceMappingURL=utils.js.map