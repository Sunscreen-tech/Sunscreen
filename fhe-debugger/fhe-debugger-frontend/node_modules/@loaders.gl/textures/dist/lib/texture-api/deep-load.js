"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shallowLoad = exports.deepLoad = void 0;
// loaders.gl, MIT license
const async_deep_map_1 = require("./async-deep-map");
async function deepLoad(urlTree, load, options) {
    return await (0, async_deep_map_1.asyncDeepMap)(urlTree, (url) => shallowLoad(url, load, options));
}
exports.deepLoad = deepLoad;
async function shallowLoad(url, load, options) {
    // console.error('loading', url);
    const response = await fetch(url, options.fetch);
    const arrayBuffer = await response.arrayBuffer();
    return await load(arrayBuffer, options);
}
exports.shallowLoad = shallowLoad;
