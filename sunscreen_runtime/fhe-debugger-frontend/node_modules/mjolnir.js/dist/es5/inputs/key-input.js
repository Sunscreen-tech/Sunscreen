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
var KEY_EVENTS = constants_1.INPUT_EVENT_TYPES.KEY_EVENTS;
var DOWN_EVENT_TYPE = 'keydown';
var UP_EVENT_TYPE = 'keyup';
var KeyInput = /** @class */ (function (_super) {
    __extends(KeyInput, _super);
    function KeyInput(element, callback, options) {
        var _this = _super.call(this, element, callback, options) || this;
        _this.handleEvent = function (event) {
            // Ignore if focused on text input
            var targetElement = (event.target || event.srcElement);
            if ((targetElement.tagName === 'INPUT' && targetElement.type === 'text') ||
                targetElement.tagName === 'TEXTAREA') {
                return;
            }
            if (_this.enableDownEvent && event.type === 'keydown') {
                _this.callback({
                    type: DOWN_EVENT_TYPE,
                    srcEvent: event,
                    key: event.key,
                    target: event.target
                });
            }
            if (_this.enableUpEvent && event.type === 'keyup') {
                _this.callback({
                    type: UP_EVENT_TYPE,
                    srcEvent: event,
                    key: event.key,
                    target: event.target
                });
            }
        };
        _this.enableDownEvent = _this.options.enable;
        _this.enableUpEvent = _this.options.enable;
        _this.events = (_this.options.events || []).concat(KEY_EVENTS);
        element.tabIndex = _this.options.tabIndex || 0;
        element.style.outline = 'none';
        _this.events.forEach(function (event) { return element.addEventListener(event, _this.handleEvent); });
        return _this;
    }
    KeyInput.prototype.destroy = function () {
        var _this = this;
        this.events.forEach(function (event) { return _this.element.removeEventListener(event, _this.handleEvent); });
    };
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    KeyInput.prototype.enableEventType = function (eventType, enabled) {
        if (eventType === DOWN_EVENT_TYPE) {
            this.enableDownEvent = enabled;
        }
        if (eventType === UP_EVENT_TYPE) {
            this.enableUpEvent = enabled;
        }
    };
    return KeyInput;
}(input_1.default));
exports.default = KeyInput;
//# sourceMappingURL=key-input.js.map