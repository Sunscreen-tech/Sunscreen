import type EventManager from '../event-manager';
import type { MjolnirEventRaw, MjolnirEventWrapper, MjolnirEvent } from '../types';
export declare type HandlerOptions = {
    srcElement?: 'root' | HTMLElement;
    priority?: number;
};
declare type EventHandler = {
    type: string;
    handler: (event: MjolnirEvent) => void;
    once?: boolean;
    passive?: boolean;
} & HandlerOptions;
export default class EventRegistrar {
    eventManager: EventManager;
    recognizerName: string;
    handlers: EventHandler[];
    handlersByElement: Map<'root' | HTMLElement, EventHandler[]>;
    _active: boolean;
    constructor(eventManager: EventManager);
    isEmpty(): boolean;
    add(type: string, handler: (event: MjolnirEvent) => void, options: HTMLElement | HandlerOptions, once?: boolean, passive?: boolean): void;
    remove(type: string, handler: (event: MjolnirEvent) => void): void;
    /**
     * Handles hammerjs event
     */
    handleEvent: (event: MjolnirEventRaw) => void;
    /**
     * Invoke handlers on a particular element
     */
    _emit<T extends MjolnirEventRaw>(event: MjolnirEventWrapper<T>, srcElement: 'root' | HTMLElement): void;
    /**
     * Normalizes hammerjs and custom events to have predictable fields.
     */
    _normalizeEvent<T extends MjolnirEventRaw>(event: T): MjolnirEventWrapper<T>;
}
export {};
