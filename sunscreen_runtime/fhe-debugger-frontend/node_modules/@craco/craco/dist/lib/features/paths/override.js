"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.overridePaths = void 0;
var cra_1 = require("../../cra");
var utils_1 = require("../../utils");
function overridePaths(cracoConfig, context) {
    var newConfig = context.paths;
    if (cracoConfig.paths) {
        if ((0, utils_1.isFunction)(cracoConfig.paths)) {
            newConfig = cracoConfig.paths(newConfig, context);
        }
        else {
            newConfig = __assign(__assign({}, newConfig), cracoConfig.paths);
        }
        (0, cra_1.overrideCraPaths)(cracoConfig, newConfig);
    }
    return newConfig;
}
exports.overridePaths = overridePaths;
