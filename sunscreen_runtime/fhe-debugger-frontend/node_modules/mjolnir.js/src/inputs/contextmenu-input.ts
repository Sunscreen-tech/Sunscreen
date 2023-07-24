import type {MjolnirPointerEventRaw} from '../types';
import Input, {InputOptions} from './input';

const EVENT_TYPE = 'contextmenu';

export default class ContextmenuInput extends Input<MjolnirPointerEventRaw, InputOptions> {
  constructor(
    element: HTMLElement,
    callback: (event: MjolnirPointerEventRaw) => void,
    options: InputOptions
  ) {
    super(element, callback, options);

    element.addEventListener('contextmenu', this.handleEvent);
  }

  destroy() {
    this.element.removeEventListener('contextmenu', this.handleEvent);
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

  handleEvent = (event: MouseEvent) => {
    if (!this.options.enable) {
      return;
    }

    this.callback({
      type: EVENT_TYPE,
      center: {
        x: event.clientX,
        y: event.clientY
      },
      srcEvent: event,
      pointerType: 'mouse',
      target: event.target as HTMLElement
    });
  };
}
