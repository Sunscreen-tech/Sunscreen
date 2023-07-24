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
var Input = /** @class */ (function () {
    function Input(element, callback, options) {
        this.element = element;
        this.callback = callback;
        this.options = __assign({ enable: true }, options);
    }
    return Input;
}());
exports.default = Input;
//# sourceMappingURL=input.js.map