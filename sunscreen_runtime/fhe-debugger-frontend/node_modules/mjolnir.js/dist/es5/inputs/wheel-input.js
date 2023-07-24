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
var constants_1 = require("../constants");
var globals_1 = require("../utils/globals");
var firefox = globals_1.userAgent.indexOf('firefox') !== -1;
var WHEEL_EVENTS = constants_1.INPUT_EVENT_TYPES.WHEEL_EVENTS;
var EVENT_TYPE = 'wheel';
// Constants for normalizing input delta
var WHEEL_DELTA_MAGIC_SCALER = 4.000244140625;
var WHEEL_DELTA_PER_LINE = 40;
// Slow down zoom if shift key is held for more precise zooming
var SHIFT_MULTIPLIER = 0.25;
var WheelInput = /** @class */ (function (_super) {
    __extends(WheelInput, _super);
    function WheelInput(element, callback, options) {
        var _this = _super.call(this, element, callback, options) || this;
        /* eslint-disable complexity, max-statements */
        _this.handleEvent = function (event) {
            if (!_this.options.enable) {
                return;
            }
            var value = event.deltaY;
            if (globals_1.window.WheelEvent) {
                // Firefox doubles the values on retina screens...
                if (firefox && event.deltaMode === globals_1.window.WheelEvent.DOM_DELTA_PIXEL) {
                    value /= globals_1.window.devicePixelRatio;
                }
                if (event.deltaMode === globals_1.window.WheelEvent.DOM_DELTA_LINE) {
                    value *= WHEEL_DELTA_PER_LINE;
                }
            }
            if (value !== 0 && value % WHEEL_DELTA_MAGIC_SCALER === 0) {
                // This one is definitely a mouse wheel event.
                // Normalize this value to match trackpad.
                value = Math.floor(value / WHEEL_DELTA_MAGIC_SCALER);
            }
            if (event.shiftKey && value) {
                value = value * SHIFT_MULTIPLIER;
            }
            _this.callback({
                type: EVENT_TYPE,
                center: {
                    x: event.clientX,
                    y: event.clientY
                },
                delta: -value,
                srcEvent: event,
                pointerType: 'mouse',
                target: event.target
            });
        };
        _this.events = (_this.options.events || []).concat(WHEEL_EVENTS);
        _this.events.forEach(function (event) {
            return element.addEventListener(event, _this.handleEvent, globals_1.passiveSupported ? { passive: false } : false);
        });
        return _this;
    }
    WheelInput.prototype.destroy = function () {
        var _this = this;
        this.events.forEach(function (event) { return _this.element.removeEventListener(event, _this.handleEvent); });
    };
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    WheelInput.prototype.enableEventType = function (eventType, enabled) {
        if (eventType === EVENT_TYPE) {
            this.options.enable = enabled;
        }
    };
    return WheelInput;
}(input_1.default));
exports.default = WheelInput;
//# sourceMappingURL=wheel-input.js.map