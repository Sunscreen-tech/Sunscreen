"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLoadableWorkerURL = getLoadableWorkerURL;
var _assert = require("../env-utils/assert");
var workerURLCache = new Map();
function getLoadableWorkerURL(props) {
  (0, _assert.assert)(props.source && !props.url || !props.source && props.url);
  var workerURL = workerURLCache.get(props.source || props.url);
  if (!workerURL) {
    if (props.url) {
      workerURL = getLoadableWorkerURLFromURL(props.url);
      workerURLCache.set(props.url, workerURL);
    }
    if (props.source) {
      workerURL = getLoadableWorkerURLFromSource(props.source);
      workerURLCache.set(props.source, workerURL);
    }
  }
  (0, _assert.assert)(workerURL);
  return workerURL;
}
function getLoadableWorkerURLFromURL(url) {
  if (!url.startsWith('http')) {
    return url;
  }
  var workerSource = buildScriptSource(url);
  return getLoadableWorkerURLFromSource(workerSource);
}
function getLoadableWorkerURLFromSource(workerSource) {
  var blob = new Blob([workerSource], {
    type: 'application/javascript'
  });
  return URL.createObjectURL(blob);
}
function buildScriptSource(workerUrl) {
  return "try {\n  importScripts('".concat(workerUrl, "');\n} catch (error) {\n  console.error(error);\n  throw error;\n}");
}
//# sourceMappingURL=get-loadable-worker-url.js.map