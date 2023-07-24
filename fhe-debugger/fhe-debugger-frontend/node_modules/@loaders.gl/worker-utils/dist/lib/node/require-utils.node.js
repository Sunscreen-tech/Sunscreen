"use strict";
// Fork of https://github.com/floatdrop/require-from-string/blob/master/index.js
// Copyright (c) Vsevolod Strukchinsky <floatdrop@gmail.com> (github.com/floatdrop)
// MIT license
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFromString = exports.requireFromFile = void 0;
// this file is not visible to webpack (it is excluded in the package.json "browser" field).
const module_1 = __importDefault(require("module"));
const path_1 = __importDefault(require("path"));
// Node.js Dynamically require from file
// Relative names are resolved relative to cwd
// This indirect function is provided because webpack will try to bundle `module.require`.
// this file is not visible to webpack (it is excluded in the package.json "browser" field).
async function requireFromFile(filename) {
    if (filename.startsWith('http')) {
        const response = await fetch(filename);
        const code = await response.text();
        return requireFromString(code);
    }
    if (!filename.startsWith('/')) {
        filename = `${process.cwd()}/${filename}`;
    }
    return require(filename);
}
exports.requireFromFile = requireFromFile;
// Dynamically require from string
// - `code` - Required - Type: string - Module code.
// - `filename` - Type: string - Default: '' - Optional filename.
// - `options.appendPaths` Type: Array List of paths, that will be appended to module paths.
// Useful, when you want to be able require modules from these paths.
// - `options.prependPaths` Type: Array Same as appendPaths, but paths will be prepended.
function requireFromString(code, filename = '', options) {
    if (typeof filename === 'object') {
        options = filename;
        filename = '';
    }
    if (typeof code !== 'string') {
        throw new Error(`code must be a string, not ${typeof code}`);
    }
    // @ts-ignore
    const paths = module_1.default._nodeModulePaths(path_1.default.dirname(filename));
    const parent = module.parent;
    // @ts-ignore
    const newModule = new module_1.default(filename, parent);
    newModule.filename = filename;
    newModule.paths = []
        .concat(options?.prependPaths || [])
        .concat(paths)
        .concat(options?.appendPaths || []);
    // @ts-ignore
    newModule._compile(code, filename);
    if (parent && parent.children) {
        parent.children.splice(parent.children.indexOf(newModule), 1);
    }
    return newModule.exports;
}
exports.requireFromString = requireFromString;
