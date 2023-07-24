import type { MjolnirKeyEventRaw } from '../types';
import Input, { InputOptions } from './input';
declare type KeyInputOptions = InputOptions & {
    events?: string[];
    tabIndex?: number;
};
export default class KeyInput extends Input<MjolnirKeyEventRaw, KeyInputOptions> {
    enableDownEvent: boolean;
    enableUpEvent: boolean;
    events: string[];
    constructor(element: HTMLElement, callback: (event: MjolnirKeyEventRaw) => void, options: KeyInputOptions);
    destroy(): void;
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType: string, enabled: boolean): void;
    handleEvent: (event: KeyboardEvent) => void;
}
export {};
