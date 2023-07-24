import type { MjolnirPointerEventRaw } from '../types';
import Input, { InputOptions } from './input';
export default class ContextmenuInput extends Input<MjolnirPointerEventRaw, InputOptions> {
    constructor(element: HTMLElement, callback: (event: MjolnirPointerEventRaw) => void, options: InputOptions);
    destroy(): void;
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType: string, enabled: boolean): void;
    handleEvent: (event: MouseEvent) => void;
}
