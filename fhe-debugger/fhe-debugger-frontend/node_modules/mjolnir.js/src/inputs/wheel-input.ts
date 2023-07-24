import type {MjolnirWheelEventRaw} from '../types';
import Input, {InputOptions} from './input';

import {INPUT_EVENT_TYPES} from '../constants';
import {window, userAgent, passiveSupported} from '../utils/globals';

const firefox = userAgent.indexOf('firefox') !== -1;

const {WHEEL_EVENTS} = INPUT_EVENT_TYPES;
const EVENT_TYPE = 'wheel';

// Constants for normalizing input delta
const WHEEL_DELTA_MAGIC_SCALER = 4.000244140625;
const WHEEL_DELTA_PER_LINE = 40;
// Slow down zoom if shift key is held for more precise zooming
const SHIFT_MULTIPLIER = 0.25;

export default class WheelInput extends Input<MjolnirWheelEventRaw, InputOptions> {
  events: string[];

  constructor(
    element: HTMLElement,
    callback: (event: MjolnirWheelEventRaw) => void,
    options: InputOptions
  ) {
    super(element, callback, options);

    this.events = (this.options.events || []).concat(WHEEL_EVENTS);

    this.events.forEach(event =>
      element.addEventListener(event, this.handleEvent, passiveSupported ? {passive: false} : false)
    );
  }

  destroy() {
    this.events.forEach(event => this.element.removeEventListener(event, this.handleEvent));
  }

  /**
   * Enable this input (begin processing events)
   * if the specified event type is among those handled by this input.
   */
  enableEventType(eventType: string, enabled: boolean) {
    if (eventType === EVENT_TYPE) {
      this.options.enable = enabled;
    }
  }

  /* eslint-disable complexity, max-statements */
  handleEvent = (event: WheelEvent) => {
    if (!this.options.enable) {
      return;
    }

    let value = event.deltaY;
    if (window.WheelEvent) {
      // Firefox doubles the values on retina screens...
      if (firefox && event.deltaMode === window.WheelEvent.DOM_DELTA_PIXEL) {
        value /= window.devicePixelRatio;
      }
      if (event.deltaMode === window.WheelEvent.DOM_DELTA_LINE) {
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

    this.callback({
      type: EVENT_TYPE,
      center: {
        x: event.clientX,
        y: event.clientY
      },
      delta: -value,
      srcEvent: event,
      pointerType: 'mouse',
      target: event.target as HTMLElement
    });
  };
}
