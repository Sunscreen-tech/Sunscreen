"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFetchFunction = exports.DataSource = void 0;
/** base class of all data sources */
class DataSource {
    constructor(props) {
        this._needsRefresh = true;
        this.props = { ...props };
        this.loadOptions = { ...props.loadOptions };
        this.fetch = getFetchFunction(this.loadOptions);
    }
    setProps(props) {
        this.props = Object.assign(this.props, props);
        // TODO - add a shallow compare to avoid setting refresh if no change?
        this.setNeedsRefresh();
    }
    /** Mark this data source as needing a refresh (redraw) */
    setNeedsRefresh() {
        this._needsRefresh = true;
    }
    /**
     * Does this data source need refreshing?
     * @note The specifics of the refresh mechanism depends on type of data source
     */
    getNeedsRefresh(clear = true) {
        const needsRefresh = this._needsRefresh;
        if (clear) {
            this._needsRefresh = false;
        }
        return needsRefresh;
    }
}
exports.DataSource = DataSource;
/**
 * Gets the current fetch function from options
 * @todo - move to loader-utils module
 * @todo - use in core module counterpart
 * @param options
 * @param context
 */
function getFetchFunction(options) {
    const fetchFunction = options?.fetch;
    // options.fetch can be a function
    if (fetchFunction && typeof fetchFunction === 'function') {
        return (url, fetchOptions) => fetchFunction(url, fetchOptions);
    }
    // options.fetch can be an options object, use global fetch with those options
    const fetchOptions = options?.fetch;
    if (fetchOptions && typeof fetchOptions !== 'function') {
        return (url) => fetch(url, fetchOptions);
    }
    // else return the global fetch function
    return (url) => fetch(url);
}
exports.getFetchFunction = getFetchFunction;
