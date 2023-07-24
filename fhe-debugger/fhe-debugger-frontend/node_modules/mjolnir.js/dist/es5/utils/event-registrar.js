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
var event_utils_1 = require("./event-utils");
var DEFAULT_OPTIONS = {
    srcElement: 'root',
    priority: 0
};
var EventRegistrar = /** @class */ (function () {
    function EventRegistrar(eventManager) {
        var _this = this;
        /**
         * Handles hammerjs event
         */
        this.handleEvent = function (event) {
            if (_this.isEmpty()) {
                return;
            }
            var mjolnirEvent = _this._normalizeEvent(event);
            var target = event.srcEvent.target;
            while (target && target !== mjolnirEvent.rootElement) {
                _this._emit(mjolnirEvent, target);
                if (mjolnirEvent.handled) {
                    return;
                }
                target = target.parentNode;
            }
            _this._emit(mjolnirEvent, 'root');
        };
        this.eventManager = eventManager;
        this.handlers = [];
        // Element -> handler map
        this.handlersByElement = new Map();
        this._active = false;
    }
    // Returns true if there are no non-passive handlers
    EventRegistrar.prototype.isEmpty = function () {
        return !this._active;
    };
    EventRegistrar.prototype.add = function (type, handler, options, once, passive) {
        if (once === void 0) { once = false; }
        if (passive === void 0) { passive = false; }
        var _a = this, handlers = _a.handlers, handlersByElement = _a.handlersByElement;
        var opts = DEFAULT_OPTIONS;
        if (typeof options === 'string' || (options && options.addEventListener)) {
            // is DOM element, backward compatibility
            // @ts-ignore
            opts = __assign(__assign({}, DEFAULT_OPTIONS), { srcElement: options });
        }
        else if (options) {
            opts = __assign(__assign({}, DEFAULT_OPTIONS), options);
        }
        var entries = handlersByElement.get(opts.srcElement);
        if (!entries) {
            entries = [];
            handlersByElement.set(opts.srcElement, entries);
        }
        var entry = {
            type: type,
            handler: handler,
            srcElement: opts.srcElement,
            priority: opts.priority
        };
        if (once) {
            entry.once = true;
        }
        if (passive) {
            entry.passive = true;
        }
        handlers.push(entry);
        this._active = this._active || !entry.passive;
        // Sort handlers by descending priority
        // Handlers with the same priority are excuted in the order of registration
        var insertPosition = entries.length - 1;
        while (insertPosition >= 0) {
            if (entries[insertPosition].priority >= entry.priority) {
                break;
            }
            insertPosition--;
        }
        entries.splice(insertPosition + 1, 0, entry);
    };
    EventRegistrar.prototype.remove = function (type, handler) {
        var _a = this, handlers = _a.handlers, handlersByElement = _a.handlersByElement;
        for (var i = handlers.length - 1; i >= 0; i--) {
            var entry = handlers[i];
            if (entry.type === type && entry.handler === handler) {
                handlers.splice(i, 1);
                var entries = handlersByElement.get(entry.srcElement);
                entries.splice(entries.indexOf(entry), 1);
                if (entries.length === 0) {
                    handlersByElement.delete(entry.srcElement);
                }
            }
        }
        this._active = handlers.some(function (entry) { return !entry.passive; });
    };
    /**
     * Invoke handlers on a particular element
     */
    EventRegistrar.prototype._emit = function (event, srcElement) {
        var entries = this.handlersByElement.get(srcElement);
        if (entries) {
            var immediatePropagationStopped_1 = false;
            // Prevents the current event from bubbling up
            var stopPropagation = function () {
                event.handled = true;
            };
            // Prevent any remaining listeners from being called
            var stopImmediatePropagation = function () {
                event.handled = true;
                immediatePropagationStopped_1 = true;
            };
            var entriesToRemove = [];
            for (var i = 0; i < entries.length; i++) {
                var _a = entries[i], type = _a.type, handler = _a.handler, once = _a.once;
                handler(__assign(__assign({}, event), { 
                    // @ts-ignore
                    type: type, stopPropagation: stopPropagation, stopImmediatePropagation: stopImmediatePropagation }));
                if (once) {
                    entriesToRemove.push(entries[i]);
                }
                if (immediatePropagationStopped_1) {
                    break;
                }
            }
            for (var i = 0; i < entriesToRemove.length; i++) {
                var _b = entriesToRemove[i], type = _b.type, handler = _b.handler;
                this.remove(type, handler);
            }
        }
    };
    /**
     * Normalizes hammerjs and custom events to have predictable fields.
     */
    EventRegistrar.prototype._normalizeEvent = function (event) {
        var rootElement = this.eventManager.getElement();
        return __assign(__assign(__assign(__assign({}, event), (0, event_utils_1.whichButtons)(event)), (0, event_utils_1.getOffsetPosition)(event, rootElement)), { preventDefault: function () {
                event.srcEvent.preventDefault();
            }, stopImmediatePropagation: null, stopPropagation: null, handled: false, rootElement: rootElement });
    };
    return EventRegistrar;
}());
exports.default = EventRegistrar;
//# sourceMappingURL=event-registrar.js.map