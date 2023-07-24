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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var hammer_1 = require("./utils/hammer");
var wheel_input_1 = require("./inputs/wheel-input");
var move_input_1 = require("./inputs/move-input");
var key_input_1 = require("./inputs/key-input");
var contextmenu_input_1 = require("./inputs/contextmenu-input");
var event_registrar_1 = require("./utils/event-registrar");
var constants_1 = require("./constants");
var DEFAULT_OPTIONS = {
    // event handlers
    events: null,
    // custom recognizers
    recognizers: null,
    recognizerOptions: {},
    // Manager class
    Manager: hammer_1.Manager,
    // allow browser default touch action
    // https://github.com/uber/react-map-gl/issues/506
    touchAction: 'none',
    tabIndex: 0
};
// Unified API for subscribing to events about both
// basic input events (e.g. 'mousemove', 'touchstart', 'wheel')
// and gestural input (e.g. 'click', 'tap', 'panstart').
// Delegates gesture related event registration and handling to Hammer.js.
var EventManager = /** @class */ (function () {
    function EventManager(element, options) {
        var _this = this;
        if (element === void 0) { element = null; }
        /**
         * Handle basic events using the 'hammer.input' Hammer.js API:
         * Before running Recognizers, Hammer emits a 'hammer.input' event
         * with the basic event info. This function emits all basic events
         * aliased to the "class" of event received.
         * See constants.BASIC_EVENT_CLASSES basic event class definitions.
         */
        this._onBasicInput = function (event) {
            var srcEvent = event.srcEvent;
            var alias = constants_1.BASIC_EVENT_ALIASES[srcEvent.type];
            if (alias) {
                // fire all events aliased to srcEvent.type
                _this.manager.emit(alias, event);
            }
        };
        /**
         * Handle events not supported by Hammer.js,
         * and pipe back out through same (Hammer) channel used by other events.
         */
        this._onOtherEvent = function (event) {
            // console.log('onotherevent', event.type, event)
            _this.manager.emit(event.type, event);
        };
        this.options = __assign(__assign({}, DEFAULT_OPTIONS), options);
        this.events = new Map();
        this.setElement(element);
        // Register all passed events.
        var events = this.options.events;
        if (events) {
            this.on(events);
        }
    }
    EventManager.prototype.getElement = function () {
        return this.element;
    };
    EventManager.prototype.setElement = function (element) {
        var e_1, _a;
        var _this = this;
        if (this.element) {
            // unregister all events
            this.destroy();
        }
        this.element = element;
        if (!element) {
            return;
        }
        var options = this.options;
        var ManagerClass = options.Manager;
        this.manager = new ManagerClass(element, {
            touchAction: options.touchAction,
            recognizers: options.recognizers || constants_1.RECOGNIZERS
        }).on('hammer.input', this._onBasicInput);
        if (!options.recognizers) {
            // Set default recognize withs
            // http://hammerjs.github.io/recognize-with/
            Object.keys(constants_1.RECOGNIZER_COMPATIBLE_MAP).forEach(function (name) {
                var recognizer = _this.manager.get(name);
                if (recognizer) {
                    constants_1.RECOGNIZER_COMPATIBLE_MAP[name].forEach(function (otherName) {
                        recognizer.recognizeWith(otherName);
                    });
                }
            });
        }
        // Set recognizer options
        for (var recognizerName in options.recognizerOptions) {
            var recognizer = this.manager.get(recognizerName);
            if (recognizer) {
                var recognizerOption = options.recognizerOptions[recognizerName];
                // `enable` is managed by the event registrations
                delete recognizerOption.enable;
                recognizer.set(recognizerOption);
            }
        }
        // Handle events not handled by Hammer.js:
        // - mouse wheel
        // - pointer/touch/mouse move
        this.wheelInput = new wheel_input_1.default(element, this._onOtherEvent, {
            enable: false
        });
        this.moveInput = new move_input_1.default(element, this._onOtherEvent, {
            enable: false
        });
        this.keyInput = new key_input_1.default(element, this._onOtherEvent, {
            enable: false,
            tabIndex: options.tabIndex
        });
        this.contextmenuInput = new contextmenu_input_1.default(element, this._onOtherEvent, {
            enable: false
        });
        try {
            // Register all existing events
            for (var _b = __values(this.events), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), eventAlias = _d[0], eventRegistrar = _d[1];
                if (!eventRegistrar.isEmpty()) {
                    // Enable recognizer for this event.
                    this._toggleRecognizer(eventRegistrar.recognizerName, true);
                    this.manager.on(eventAlias, eventRegistrar.handleEvent);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    // Tear down internal event management implementations.
    EventManager.prototype.destroy = function () {
        if (this.element) {
            // wheelInput etc. are created in setElement() and therefore
            // cannot exist if there is no element
            this.wheelInput.destroy();
            this.moveInput.destroy();
            this.keyInput.destroy();
            this.contextmenuInput.destroy();
            this.manager.destroy();
            this.wheelInput = null;
            this.moveInput = null;
            this.keyInput = null;
            this.contextmenuInput = null;
            this.manager = null;
            this.element = null;
        }
    };
    /** Register an event handler function to be called on `event` */
    EventManager.prototype.on = function (event, handler, opts) {
        this._addEventHandler(event, handler, opts, false);
    };
    EventManager.prototype.once = function (event, handler, opts) {
        this._addEventHandler(event, handler, opts, true);
    };
    EventManager.prototype.watch = function (event, handler, opts) {
        this._addEventHandler(event, handler, opts, false, true);
    };
    EventManager.prototype.off = function (event, handler) {
        this._removeEventHandler(event, handler);
    };
    /*
     * Enable/disable recognizer for the given event
     */
    EventManager.prototype._toggleRecognizer = function (name, enabled) {
        var manager = this.manager;
        if (!manager) {
            return;
        }
        var recognizer = manager.get(name);
        // @ts-ignore
        if (recognizer && recognizer.options.enable !== enabled) {
            recognizer.set({ enable: enabled });
            var fallbackRecognizers = constants_1.RECOGNIZER_FALLBACK_MAP[name];
            if (fallbackRecognizers && !this.options.recognizers) {
                // Set default require failures
                // http://hammerjs.github.io/require-failure/
                fallbackRecognizers.forEach(function (otherName) {
                    var otherRecognizer = manager.get(otherName);
                    if (enabled) {
                        // Wait for this recognizer to fail
                        otherRecognizer.requireFailure(name);
                        /**
                         * This seems to be a bug in hammerjs:
                         * requireFailure() adds both ways
                         * dropRequireFailure() only drops one way
                         * https://github.com/hammerjs/hammer.js/blob/master/src/recognizerjs/
                           recognizer-constructor.js#L136
                         */
                        recognizer.dropRequireFailure(otherName);
                    }
                    else {
                        // Do not wait for this recognizer to fail
                        otherRecognizer.dropRequireFailure(name);
                    }
                });
            }
        }
        this.wheelInput.enableEventType(name, enabled);
        this.moveInput.enableEventType(name, enabled);
        this.keyInput.enableEventType(name, enabled);
        this.contextmenuInput.enableEventType(name, enabled);
    };
    /**
     * Process the event registration for a single event + handler.
     */
    EventManager.prototype._addEventHandler = function (event, handler, opts, once, passive) {
        if (typeof event !== 'string') {
            // @ts-ignore
            opts = handler;
            // If `event` is a map, call `on()` for each entry.
            for (var eventName in event) {
                this._addEventHandler(eventName, event[eventName], opts, once, passive);
            }
            return;
        }
        var _a = this, manager = _a.manager, events = _a.events;
        // Alias to a recognized gesture as necessary.
        var eventAlias = constants_1.GESTURE_EVENT_ALIASES[event] || event;
        var eventRegistrar = events.get(eventAlias);
        if (!eventRegistrar) {
            eventRegistrar = new event_registrar_1.default(this);
            events.set(eventAlias, eventRegistrar);
            // Enable recognizer for this event.
            eventRegistrar.recognizerName = constants_1.EVENT_RECOGNIZER_MAP[eventAlias] || eventAlias;
            // Listen to the event
            if (manager) {
                manager.on(eventAlias, eventRegistrar.handleEvent);
            }
        }
        eventRegistrar.add(event, handler, opts, once, passive);
        if (!eventRegistrar.isEmpty()) {
            this._toggleRecognizer(eventRegistrar.recognizerName, true);
        }
    };
    /**
     * Process the event deregistration for a single event + handler.
     */
    EventManager.prototype._removeEventHandler = function (event, handler) {
        var e_2, _a;
        if (typeof event !== 'string') {
            // If `event` is a map, call `off()` for each entry.
            for (var eventName in event) {
                this._removeEventHandler(eventName, event[eventName]);
            }
            return;
        }
        var events = this.events;
        // Alias to a recognized gesture as necessary.
        var eventAlias = constants_1.GESTURE_EVENT_ALIASES[event] || event;
        var eventRegistrar = events.get(eventAlias);
        if (!eventRegistrar) {
            return;
        }
        eventRegistrar.remove(event, handler);
        if (eventRegistrar.isEmpty()) {
            var recognizerName = eventRegistrar.recognizerName;
            // Disable recognizer if no more handlers are attached to its events
            var isRecognizerUsed = false;
            try {
                for (var _b = __values(events.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var eh = _c.value;
                    if (eh.recognizerName === recognizerName && !eh.isEmpty()) {
                        isRecognizerUsed = true;
                        break;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            if (!isRecognizerUsed) {
                this._toggleRecognizer(recognizerName, false);
            }
        }
    };
    return EventManager;
}());
exports.default = EventManager;
//# sourceMappingURL=event-manager.js.map