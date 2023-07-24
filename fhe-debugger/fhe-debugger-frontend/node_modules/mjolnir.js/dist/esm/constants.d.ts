import { RecognizerTuple } from './types';
export declare const RECOGNIZERS: RecognizerTuple[];
export declare const RECOGNIZER_COMPATIBLE_MAP: {
    readonly tripan: readonly ["rotate", "pinch", "pan"];
    readonly rotate: readonly ["pinch"];
    readonly pinch: readonly ["pan"];
    readonly pan: readonly ["press", "doubletap", "anytap", "tap"];
    readonly doubletap: readonly ["anytap"];
    readonly anytap: readonly ["tap"];
};
export declare const RECOGNIZER_FALLBACK_MAP: {
    readonly doubletap: readonly ["tap"];
};
/**
 * Only one set of basic input events will be fired by Hammer.js:
 * either pointer, touch, or mouse, depending on system support.
 * In order to enable an application to be agnostic of system support,
 * alias basic input events into "classes" of events: down, move, and up.
 * See `_onBasicInput()` for usage of these aliases.
 */
export declare const BASIC_EVENT_ALIASES: {
    readonly pointerdown: "pointerdown";
    readonly pointermove: "pointermove";
    readonly pointerup: "pointerup";
    readonly touchstart: "pointerdown";
    readonly touchmove: "pointermove";
    readonly touchend: "pointerup";
    readonly mousedown: "pointerdown";
    readonly mousemove: "pointermove";
    readonly mouseup: "pointerup";
};
export declare const INPUT_EVENT_TYPES: {
    readonly KEY_EVENTS: readonly ["keydown", "keyup"];
    readonly MOUSE_EVENTS: readonly ["mousedown", "mousemove", "mouseup", "mouseover", "mouseout", "mouseleave"];
    readonly WHEEL_EVENTS: readonly ["wheel", "mousewheel"];
};
/**
 * "Gestural" events are those that have semantic meaning beyond the basic input event,
 * e.g. a click or tap is a sequence of `down` and `up` events with no `move` event in between.
 * Hammer.js handles these with its Recognizer system;
 * this block maps event names to the Recognizers required to detect the events.
 */
export declare const EVENT_RECOGNIZER_MAP: {
    readonly tap: "tap";
    readonly anytap: "anytap";
    readonly doubletap: "doubletap";
    readonly press: "press";
    readonly pinch: "pinch";
    readonly pinchin: "pinch";
    readonly pinchout: "pinch";
    readonly pinchstart: "pinch";
    readonly pinchmove: "pinch";
    readonly pinchend: "pinch";
    readonly pinchcancel: "pinch";
    readonly rotate: "rotate";
    readonly rotatestart: "rotate";
    readonly rotatemove: "rotate";
    readonly rotateend: "rotate";
    readonly rotatecancel: "rotate";
    readonly tripan: "tripan";
    readonly tripanstart: "tripan";
    readonly tripanmove: "tripan";
    readonly tripanup: "tripan";
    readonly tripandown: "tripan";
    readonly tripanleft: "tripan";
    readonly tripanright: "tripan";
    readonly tripanend: "tripan";
    readonly tripancancel: "tripan";
    readonly pan: "pan";
    readonly panstart: "pan";
    readonly panmove: "pan";
    readonly panup: "pan";
    readonly pandown: "pan";
    readonly panleft: "pan";
    readonly panright: "pan";
    readonly panend: "pan";
    readonly pancancel: "pan";
    readonly swipe: "swipe";
    readonly swipeleft: "swipe";
    readonly swiperight: "swipe";
    readonly swipeup: "swipe";
    readonly swipedown: "swipe";
};
/**
 * Map gestural events typically provided by browsers
 * that are not reported in 'hammer.input' events
 * to corresponding Hammer.js gestures.
 */
export declare const GESTURE_EVENT_ALIASES: {
    readonly click: "tap";
    readonly anyclick: "anytap";
    readonly dblclick: "doubletap";
    readonly mousedown: "pointerdown";
    readonly mousemove: "pointermove";
    readonly mouseup: "pointerup";
    readonly mouseover: "pointerover";
    readonly mouseout: "pointerout";
    readonly mouseleave: "pointerleave";
};
