import type {MjolnirKeyEventRaw} from '../types';
import Input, {InputOptions} from './input';

import {INPUT_EVENT_TYPES} from '../constants';

const {KEY_EVENTS} = INPUT_EVENT_TYPES;
const DOWN_EVENT_TYPE = 'keydown';
const UP_EVENT_TYPE = 'keyup';

type KeyInputOptions = InputOptions & {
  events?: string[];
  tabIndex?: number;
};

export default class KeyInput extends Input<MjolnirKeyEventRaw, KeyInputOptions> {
  enableDownEvent: boolean;
  enableUpEvent: boolean;

  events: string[];

  constructor(
    element: HTMLElement,
    callback: (event: MjolnirKeyEventRaw) => void,
    options: KeyInputOptions
  ) {
    super(element, callback, options);

    this.enableDownEvent = this.options.enable;
    this.enableUpEvent = this.options.enable;

    this.events = (this.options.events || []).concat(KEY_EVENTS);

    element.tabIndex = this.options.tabIndex || 0;
    element.style.outline = 'none';
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
    if (eventType === DOWN_EVENT_TYPE) {
      this.enableDownEvent = enabled;
    }
    if (eventType === UP_EVENT_TYPE) {
      this.enableUpEvent = enabled;
    }
  }

  handleEvent = (event: KeyboardEvent) => {
    // Ignore if focused on text input
    const targetElement = (event.target || event.srcElement) as HTMLElement;
    if (
      (targetElement.tagName === 'INPUT' && (targetElement as HTMLInputElement).type === 'text') ||
      targetElement.tagName === 'TEXTAREA'
    ) {
      return;
    }

    if (this.enableDownEvent && event.type === 'keydown') {
      this.callback({
        type: DOWN_EVENT_TYPE,
        srcEvent: event,
        key: event.key,
        target: event.target as HTMLElement
      });
    }

    if (this.enableUpEvent && event.type === 'keyup') {
      this.callback({
        type: UP_EVENT_TYPE,
        srcEvent: event,
        key: event.key,
        target: event.target as HTMLElement
      });
    }
  };
}
