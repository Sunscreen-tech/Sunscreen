import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
export class DataSource {
  constructor(props) {
    _defineProperty(this, "fetch", void 0);
    _defineProperty(this, "loadOptions", void 0);
    _defineProperty(this, "_needsRefresh", true);
    _defineProperty(this, "props", void 0);
    this.props = {
      ...props
    };
    this.loadOptions = {
      ...props.loadOptions
    };
    this.fetch = getFetchFunction(this.loadOptions);
  }
  setProps(props) {
    this.props = Object.assign(this.props, props);
    this.setNeedsRefresh();
  }
  setNeedsRefresh() {
    this._needsRefresh = true;
  }
  getNeedsRefresh() {
    let clear = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    const needsRefresh = this._needsRefresh;
    if (clear) {
      this._needsRefresh = false;
    }
    return needsRefresh;
  }
}
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
//# sourceMappingURL=data-source.js.map