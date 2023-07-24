import type { HammerManagerConstructor, MjolnirEvent, RecognizerOptions, RecognizerTuple, MjolnirEventHandlers } from './types';
import { HandlerOptions } from './utils/event-registrar';
export declare type EventManagerOptions = {
    events?: MjolnirEventHandlers;
    recognizers?: RecognizerTuple[];
    recognizerOptions?: {
        [type: string]: RecognizerOptions;
    };
    Manager?: HammerManagerConstructor;
    touchAction?: string;
    tabIndex?: number;
};
export default class EventManager {
    private manager;
    private element;
    private options;
    private events;
    private wheelInput;
    private moveInput;
    private contextmenuInput;
    private keyInput;
    constructor(element: HTMLElement, options: EventManagerOptions);
    getElement(): HTMLElement;
    setElement(element: HTMLElement): void;
    destroy(): void;
    /** Register multiple event handlers */
    on(events: MjolnirEventHandlers, opts?: HandlerOptions): void;
    on<EventT extends MjolnirEvent>(event: EventT['type'], handler: (event: EventT) => void, opts?: HandlerOptions): void;
    /** Register an event handler function to be called on `event`, then remove it */
    once(events: MjolnirEventHandlers, opts?: HandlerOptions): void;
    once<EventT extends MjolnirEvent>(event: EventT['type'], handler: (event: EventT) => void, opts?: HandlerOptions): void;
    /** Register an event handler function to be called on `event`
     * This handler does not ask the event to be recognized at all times.
     * Instead, it only "intercepts" the event if some other handler is getting it.
     */
    watch(events: MjolnirEventHandlers, opts?: HandlerOptions): void;
    watch<EventT extends MjolnirEvent>(event: EventT['type'], handler: (event: EventT) => void, opts?: HandlerOptions): void;
    /**
     * Deregister a previously-registered event handler.
     */
    off(events: MjolnirEventHandlers): void;
    off<EventT extends MjolnirEvent>(event: EventT['type'], handler: (event: EventT) => void): void;
    private _toggleRecognizer;
    /**
     * Process the event registration for a single event + handler.
     */
    private _addEventHandler;
    /**
     * Process the event deregistration for a single event + handler.
     */
    private _removeEventHandler;
    /**
     * Handle basic events using the 'hammer.input' Hammer.js API:
     * Before running Recognizers, Hammer emits a 'hammer.input' event
     * with the basic event info. This function emits all basic events
     * aliased to the "class" of event received.
     * See constants.BASIC_EVENT_CLASSES basic event class definitions.
     */
    private _onBasicInput;
    /**
     * Handle events not supported by Hammer.js,
     * and pipe back out through same (Hammer) channel used by other events.
     */
    private _onOtherEvent;
}
