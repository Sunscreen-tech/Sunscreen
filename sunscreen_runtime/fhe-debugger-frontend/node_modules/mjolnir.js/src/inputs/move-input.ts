import type {MjolnirPointerEventRaw} from '../types';
import Input, {InputOptions} from './input';
import {INPUT_EVENT_TYPES} from '../constants';

const {MOUSE_EVENTS} = INPUT_EVENT_TYPES;
const MOVE_EVENT_TYPE = 'pointermove';
const OVER_EVENT_TYPE = 'pointerover';
const OUT_EVENT_TYPE = 'pointerout';
const ENTER_EVENT_TYPE = 'pointerenter';
const LEAVE_EVENT_TYPE = 'pointerleave';

/**
 * Hammer.js swallows 'move' events (for pointer/touch/mouse)
 * when the pointer is not down. This class sets up a handler
 * specifically for these events to work around this limitation.
 * Note that this could be extended to more intelligently handle
 * move events across input types, e.g. storing multiple simultaneous
 * pointer/touch events, calculating speed/direction, etc.
 */
export default class MoveInput extends Input<MjolnirPointerEventRaw, InputOptions> {
  pressed: boolean;
  enableMoveEvent: boolean;
  enableEnterEvent: boolean;
  enableLeaveEvent: boolean;
  enableOutEvent: boolean;
  enableOverEvent: boolean;

  events: string[];

  constructor(
    element: HTMLElement,
    callback: (event: MjolnirPointerEventRaw) => void,
    options: InputOptions
  ) {
    super(element, callback, options);

    this.pressed = false;
    const {enable} = this.options;

    this.enableMoveEvent = enable;
    this.enableLeaveEvent = enable;
    this.enableEnterEvent = enable;
    this.enableOutEvent = enable;
    this.enableOverEvent = enable;

    this.events = (this.options.events || []).concat(MOUSE_EVENTS);

    this.events.forEach(event => element.addEventListener(event, this.handleEvent));
  }

  destroy() {
    this.events.forEach(event => this.element.removeEventListener(event, this.handleEvent));
  }

  /**
   * Enable this input (begin processing events)
   * if the specified event type is among those handled by this input.
   */
  enableEventType(eventType: string, enabled: boolean) {
    if (eventType === MOVE_EVENT_TYPE) {
      this.enableMoveEvent = enabled;
    }
    if (eventType === OVER_EVENT_TYPE) {
      this.enableOverEvent = enabled;
    }
    if (eventType === OUT_EVENT_TYPE) {
      this.enableOutEvent = enabled;
    }
    if (eventType === ENTER_EVENT_TYPE) {
      this.enableEnterEvent = enabled;
    }
    if (eventType === LEAVE_EVENT_TYPE) {
      this.enableLeaveEvent = enabled;
    }
  }

  handleEvent = (event: PointerEvent) => {
    this.handleOverEvent(event);
    this.handleOutEvent(event);
    this.handleEnterEvent(event);
    this.handleLeaveEvent(event);
    this.handleMoveEvent(event);
  };

  handleOverEvent(event: PointerEvent) {
    if (this.enableOverEvent) {
      if (event.type === 'mouseover') {
        this._emit(OVER_EVENT_TYPE, event);
      }
    }
  }

  handleOutEvent(event: PointerEvent) {
    if (this.enableOutEvent) {
      if (event.type === 'mouseout') {
        this._emit(OUT_EVENT_TYPE, event);
      }
    }
  }

  handleEnterEvent(event: PointerEvent) {
    if (this.enableEnterEvent) {
      if (event.type === 'mouseenter') {
        this._emit(ENTER_EVENT_TYPE, event);
      }
    }
  }

  handleLeaveEvent(event: PointerEvent) {
    if (this.enableLeaveEvent) {
      if (event.type === 'mouseleave') {
        this._emit(LEAVE_EVENT_TYPE, event);
      }
    }
  }

  handleMoveEvent(event: PointerEvent) {
    if (this.enableMoveEvent) {
      switch (event.type) {
        case 'mousedown':
          if (event.button >= 0) {
            // Button is down
            this.pressed = true;
          }
          break;
        case 'mousemove':
          // Move events use `which` to track the button being pressed
          if (event.which === 0) {
            // Button is not down
            this.pressed = false;
          }
          if (!this.pressed) {
            // Drag events are emitted by hammer already
            // we just need to emit the move event on hover
            this._emit(MOVE_EVENT_TYPE, event);
          }
          break;
        case 'mouseup':
          this.pressed = false;
          break;
        default:
      }
    }
  }

  _emit(
    type: 'pointermove' | 'pointerover' | 'pointerout' | 'pointerenter' | 'pointerleave',
    event: PointerEvent
  ) {
    this.callback({
      type,
      center: {
        x: event.clientX,
        y: event.clientY
      },
      srcEvent: event,
      pointerType: 'mouse',
      target: event.target as HTMLElement
    });
  }
}
