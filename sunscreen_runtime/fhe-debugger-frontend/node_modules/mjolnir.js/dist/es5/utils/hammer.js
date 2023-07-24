"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = void 0;
// Hammer.Manager mock for use in environments without `document` / `window`.
var HammerManagerMock = /** @class */ (function () {
    function HammerManagerMock() {
        var _this = this;
        this.get = function () { return null; };
        this.set = function () { return _this; };
        this.on = function () { return _this; };
        this.off = function () { return _this; };
        this.destroy = function () { return _this; };
        this.emit = function () { return _this; };
    }
    return HammerManagerMock;
}());
exports.Manager = HammerManagerMock;
exports.default = null;
//# sourceMappingURL=hammer.js.map