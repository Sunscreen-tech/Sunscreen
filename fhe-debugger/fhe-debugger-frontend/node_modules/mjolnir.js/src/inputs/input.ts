import type {MjolnirEventRaw} from '../types';

export interface InputOptions {
  enable: boolean;
  events?: string[];
}

export default class Input<EventType extends MjolnirEventRaw, Options extends InputOptions> {
  element: HTMLElement;
  options: Options;
  callback: (e: EventType) => void;

  constructor(element: HTMLElement, callback: (e: EventType) => void, options: Options) {
    this.element = element;
    this.callback = callback;

    this.options = {enable: true, ...options};
  }
}
