"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
// Version constant cannot be imported, it needs to correspond to the build version of **this** module.
// __VERSION__ is injected by babel-plugin-version-inline
// @ts-ignore TS2304: Cannot find name '__VERSION__'.
exports.VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'latest';
