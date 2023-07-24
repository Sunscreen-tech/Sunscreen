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
exports.overrideBabel = void 0;
var loaders_1 = require("../../loaders");
var logger_1 = require("../../logger");
var utils_1 = require("../../utils");
// TODO: CRA use a cacheIdentifier, should we update it with the new plugins?
function addPresets(loader, babelPresets) {
    if ((0, utils_1.isArray)(babelPresets)) {
        if (loader.options && !(0, utils_1.isString)(loader.options)) {
            if (loader.options.presets) {
                loader.options.presets = loader.options.presets.concat(babelPresets);
            }
            else {
                loader.options.presets = babelPresets;
            }
        }
        else {
            loader.options = {
                presets: babelPresets,
            };
        }
    }
    (0, logger_1.log)('Added Babel presets.');
}
function addPlugins(loader, babelPlugins) {
    if ((0, utils_1.isArray)(babelPlugins)) {
        if (loader.options && !(0, utils_1.isString)(loader.options)) {
            if (loader.options.plugins) {
                loader.options.plugins = loader.options.plugins.concat(babelPlugins);
            }
            else {
                loader.options.plugins = babelPlugins;
            }
        }
        else {
            loader.options = {
                plugins: babelPlugins,
            };
        }
    }
    (0, logger_1.log)('Added Babel plugins.');
}
function addAssumptions(loader, babelAssumptions) {
    if (loader.options && !(0, utils_1.isString)(loader.options)) {
        if (loader.options.assumptions) {
            loader.options.assumptions = __assign(__assign({}, loader.options.assumptions), babelAssumptions);
        }
        else {
            loader.options.assumptions = babelAssumptions;
        }
    }
    else {
        loader.options = {
            assumptions: babelAssumptions,
        };
    }
    (0, logger_1.log)('Added Babel assumptions.');
}
function applyLoaderOptions(loader, loaderOptions, context) {
    if ((0, utils_1.isFunction)(loaderOptions)) {
        loader.options = loaderOptions(loader.options || {}, context);
        if (!loader.options) {
            throw new Error("craco: 'babel.loaderOptions' function didn't return a loader config object.");
        }
    }
    else {
        // TODO: ensure is otherwise a plain object, if not, log an error.
        loader.options = (0, utils_1.deepMergeWithArray)({}, loader.options || {}, loaderOptions);
    }
    (0, logger_1.log)('Applied Babel loader options.');
}
function overrideLoader(match, cracoConfig, context) {
    var _a;
    var _b = (_a = cracoConfig.babel) !== null && _a !== void 0 ? _a : {}, presets = _b.presets, plugins = _b.plugins, assumptions = _b.assumptions, loaderOptions = _b.loaderOptions;
    if (presets) {
        addPresets(match.loader, presets);
    }
    if (plugins) {
        addPlugins(match.loader, plugins);
    }
    if (assumptions) {
        addAssumptions(match.loader, assumptions);
    }
    if (loaderOptions) {
        applyLoaderOptions(match.loader, loaderOptions, context);
    }
}
function overrideBabel(cracoConfig, webpackConfig, context) {
    if (cracoConfig.babel) {
        var _a = (0, loaders_1.getLoaders)(webpackConfig, (0, loaders_1.loaderByName)('babel-loader')), hasFoundAny = _a.hasFoundAny, matches = _a.matches;
        if (!hasFoundAny) {
            (0, logger_1.logError)('Cannot find any Babel loaders.');
            return webpackConfig;
        }
        matches.forEach(function (x) {
            overrideLoader(x, cracoConfig, context);
        });
    }
    return webpackConfig;
}
exports.overrideBabel = overrideBabel;
