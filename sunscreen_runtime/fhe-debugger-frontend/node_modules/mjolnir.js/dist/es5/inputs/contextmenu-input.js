"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var input_1 = require("./input");
var EVENT_TYPE = 'contextmenu';
var ContextmenuInput = /** @class */ (function (_super) {
    __extends(ContextmenuInput, _super);
    function ContextmenuInput(element, callback, options) {
        var _this = _super.call(this, element, callback, options) || this;
        _this.handleEvent = function (event) {
            if (!_this.options.enable) {
                return;
            }
            _this.callback({
                type: EVENT_TYPE,
                center: {
                    x: event.clientX,
                    y: event.clientY
                },
                srcEvent: event,
                pointerType: 'mouse',
                target: event.target
            });
        };
        element.addEventListener('contextmenu', _this.handleEvent);
        return _this;
    }
    ContextmenuInput.prototype.destroy = function () {
        this.element.removeEventListener('contextmenu', this.handleEvent);
    };
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    ContextmenuInput.prototype.enableEventType = function (eventType, enabled) {
        if (eventType === EVENT_TYPE) {
            this.options.enable = enabled;
        }
    };
    return ContextmenuInput;
}(input_1.default));
exports.default = ContextmenuInput;
//# sourceMappingURL=contextmenu-input.js.map