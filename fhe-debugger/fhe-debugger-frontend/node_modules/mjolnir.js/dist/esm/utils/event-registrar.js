import { whichButtons, getOffsetPosition } from './event-utils';
const DEFAULT_OPTIONS = {
    srcElement: 'root',
    priority: 0
};
export default class EventRegistrar {
    constructor(eventManager) {
        /**
         * Handles hammerjs event
         */
        this.handleEvent = (event) => {
            if (this.isEmpty()) {
                return;
            }
            const mjolnirEvent = this._normalizeEvent(event);
            let target = event.srcEvent.target;
            while (target && target !== mjolnirEvent.rootElement) {
                this._emit(mjolnirEvent, target);
                if (mjolnirEvent.handled) {
                    return;
                }
                target = target.parentNode;
            }
            this._emit(mjolnirEvent, 'root');
        };
        this.eventManager = eventManager;
        this.handlers = [];
        // Element -> handler map
        this.handlersByElement = new Map();
        this._active = false;
    }
    // Returns true if there are no non-passive handlers
    isEmpty() {
        return !this._active;
    }
    add(type, handler, options, once = false, passive = false) {
        const { handlers, handlersByElement } = this;
        let opts = DEFAULT_OPTIONS;
        if (typeof options === 'string' || (options && options.addEventListener)) {
            // is DOM element, backward compatibility
            // @ts-ignore
            opts = { ...DEFAULT_OPTIONS, srcElement: options };
        }
        else if (options) {
            opts = { ...DEFAULT_OPTIONS, ...options };
        }
        let entries = handlersByElement.get(opts.srcElement);
        if (!entries) {
            entries = [];
            handlersByElement.set(opts.srcElement, entries);
        }
        const entry = {
            type,
            handler,
            srcElement: opts.srcElement,
            priority: opts.priority
        };
        if (once) {
            entry.once = true;
        }
        if (passive) {
            entry.passive = true;
        }
        handlers.push(entry);
        this._active = this._active || !entry.passive;
        // Sort handlers by descending priority
        // Handlers with the same priority are excuted in the order of registration
        let insertPosition = entries.length - 1;
        while (insertPosition >= 0) {
            if (entries[insertPosition].priority >= entry.priority) {
                break;
            }
            insertPosition--;
        }
        entries.splice(insertPosition + 1, 0, entry);
    }
    remove(type, handler) {
        const { handlers, handlersByElement } = this;
        for (let i = handlers.length - 1; i >= 0; i--) {
            const entry = handlers[i];
            if (entry.type === type && entry.handler === handler) {
                handlers.splice(i, 1);
                const entries = handlersByElement.get(entry.srcElement);
                entries.splice(entries.indexOf(entry), 1);
                if (entries.length === 0) {
                    handlersByElement.delete(entry.srcElement);
                }
            }
        }
        this._active = handlers.some(entry => !entry.passive);
    }
    /**
     * Invoke handlers on a particular element
     */
    _emit(event, srcElement) {
        const entries = this.handlersByElement.get(srcElement);
        if (entries) {
            let immediatePropagationStopped = false;
            // Prevents the current event from bubbling up
            const stopPropagation = () => {
                event.handled = true;
            };
            // Prevent any remaining listeners from being called
            const stopImmediatePropagation = () => {
                event.handled = true;
                immediatePropagationStopped = true;
            };
            const entriesToRemove = [];
            for (let i = 0; i < entries.length; i++) {
                const { type, handler, once } = entries[i];
                handler({
                    ...event,
                    // @ts-ignore
                    type,
                    stopPropagation,
                    stopImmediatePropagation
                });
                if (once) {
                    entriesToRemove.push(entries[i]);
                }
                if (immediatePropagationStopped) {
                    break;
                }
            }
            for (let i = 0; i < entriesToRemove.length; i++) {
                const { type, handler } = entriesToRemove[i];
                this.remove(type, handler);
            }
        }
    }
    /**
     * Normalizes hammerjs and custom events to have predictable fields.
     */
    _normalizeEvent(event) {
        const rootElement = this.eventManager.getElement();
        return {
            ...event,
            ...whichButtons(event),
            ...getOffsetPosition(event, rootElement),
            preventDefault: () => {
                event.srcEvent.preventDefault();
            },
            stopImmediatePropagation: null,
            stopPropagation: null,
            handled: false,
            rootElement
        };
    }
}
//# sourceMappingURL=event-registrar.js.map