import type { MjolnirPointerEventRaw } from '../types';
import Input, { InputOptions } from './input';
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
    constructor(element: HTMLElement, callback: (event: MjolnirPointerEventRaw) => void, options: InputOptions);
    destroy(): void;
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType: string, enabled: boolean): void;
    handleEvent: (event: PointerEvent) => void;
    handleOverEvent(event: PointerEvent): void;
    handleOutEvent(event: PointerEvent): void;
    handleEnterEvent(event: PointerEvent): void;
    handleLeaveEvent(event: PointerEvent): void;
    handleMoveEvent(event: PointerEvent): void;
    _emit(type: 'pointermove' | 'pointerover' | 'pointerout' | 'pointerenter' | 'pointerleave', event: PointerEvent): void;
}
