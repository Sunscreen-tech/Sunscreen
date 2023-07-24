import type { MjolnirWheelEventRaw } from '../types';
import Input, { InputOptions } from './input';
export default class WheelInput extends Input<MjolnirWheelEventRaw, InputOptions> {
    events: string[];
    constructor(element: HTMLElement, callback: (event: MjolnirWheelEventRaw) => void, options: InputOptions);
    destroy(): void;
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType: string, enabled: boolean): void;
    handleEvent: (event: WheelEvent) => void;
}
