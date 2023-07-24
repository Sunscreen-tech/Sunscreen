"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GESTURE_EVENT_ALIASES = exports.EVENT_RECOGNIZER_MAP = exports.INPUT_EVENT_TYPES = exports.BASIC_EVENT_ALIASES = exports.RECOGNIZER_FALLBACK_MAP = exports.RECOGNIZER_COMPATIBLE_MAP = exports.RECOGNIZERS = void 0;
var hammer_1 = require("./utils/hammer");
// This module contains constants that must be conditionally required
// due to `window`/`document` references downstream.
exports.RECOGNIZERS = hammer_1.default
    ? [
        [hammer_1.default.Pan, { event: 'tripan', pointers: 3, threshold: 0, enable: false }],
        [hammer_1.default.Rotate, { enable: false }],
        [hammer_1.default.Pinch, { enable: false }],
        [hammer_1.default.Swipe, { enable: false }],
        [hammer_1.default.Pan, { threshold: 0, enable: false }],
        [hammer_1.default.Press, { enable: false }],
        [hammer_1.default.Tap, { event: 'doubletap', taps: 2, enable: false }],
        // TODO - rename to 'tap' and 'singletap' in the next major release
        [hammer_1.default.Tap, { event: 'anytap', enable: false }],
        [hammer_1.default.Tap, { enable: false }]
    ]
    : null;
// Recognize the following gestures even if a given recognizer succeeds
exports.RECOGNIZER_COMPATIBLE_MAP = {
    tripan: ['rotate', 'pinch', 'pan'],
    rotate: ['pinch'],
    pinch: ['pan'],
    pan: ['press', 'doubletap', 'anytap', 'tap'],
    doubletap: ['anytap'],
    anytap: ['tap']
};
// Recognize the folling gestures only if a given recognizer fails
exports.RECOGNIZER_FALLBACK_MAP = {
    doubletap: ['tap']
};
/**
 * Only one set of basic input events will be fired by Hammer.js:
 * either pointer, touch, or mouse, depending on system support.
 * In order to enable an application to be agnostic of system support,
 * alias basic input events into "classes" of events: down, move, and up.
 * See `_onBasicInput()` for usage of these aliases.
 */
exports.BASIC_EVENT_ALIASES = {
    pointerdown: 'pointerdown',
    pointermove: 'pointermove',
    pointerup: 'pointerup',
    touchstart: 'pointerdown',
    touchmove: 'pointermove',
    touchend: 'pointerup',
    mousedown: 'pointerdown',
    mousemove: 'pointermove',
    mouseup: 'pointerup'
};
exports.INPUT_EVENT_TYPES = {
    KEY_EVENTS: ['keydown', 'keyup'],
    MOUSE_EVENTS: ['mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout', 'mouseleave'],
    WHEEL_EVENTS: [
        // Chrome, Safari
        'wheel',
        // IE
        'mousewheel'
    ]
};
/**
 * "Gestural" events are those that have semantic meaning beyond the basic input event,
 * e.g. a click or tap is a sequence of `down` and `up` events with no `move` event in between.
 * Hammer.js handles these with its Recognizer system;
 * this block maps event names to the Recognizers required to detect the events.
 */
exports.EVENT_RECOGNIZER_MAP = {
    tap: 'tap',
    anytap: 'anytap',
    doubletap: 'doubletap',
    press: 'press',
    pinch: 'pinch',
    pinchin: 'pinch',
    pinchout: 'pinch',
    pinchstart: 'pinch',
    pinchmove: 'pinch',
    pinchend: 'pinch',
    pinchcancel: 'pinch',
    rotate: 'rotate',
    rotatestart: 'rotate',
    rotatemove: 'rotate',
    rotateend: 'rotate',
    rotatecancel: 'rotate',
    tripan: 'tripan',
    tripanstart: 'tripan',
    tripanmove: 'tripan',
    tripanup: 'tripan',
    tripandown: 'tripan',
    tripanleft: 'tripan',
    tripanright: 'tripan',
    tripanend: 'tripan',
    tripancancel: 'tripan',
    pan: 'pan',
    panstart: 'pan',
    panmove: 'pan',
    panup: 'pan',
    pandown: 'pan',
    panleft: 'pan',
    panright: 'pan',
    panend: 'pan',
    pancancel: 'pan',
    swipe: 'swipe',
    swipeleft: 'swipe',
    swiperight: 'swipe',
    swipeup: 'swipe',
    swipedown: 'swipe'
};
/**
 * Map gestural events typically provided by browsers
 * that are not reported in 'hammer.input' events
 * to corresponding Hammer.js gestures.
 */
exports.GESTURE_EVENT_ALIASES = {
    click: 'tap',
    anyclick: 'anytap',
    dblclick: 'doubletap',
    mousedown: 'pointerdown',
    mousemove: 'pointermove',
    mouseup: 'pointerup',
    mouseover: 'pointerover',
    mouseout: 'pointerout',
    mouseleave: 'pointerleave'
};
//# sourceMappingURL=constants.js.map