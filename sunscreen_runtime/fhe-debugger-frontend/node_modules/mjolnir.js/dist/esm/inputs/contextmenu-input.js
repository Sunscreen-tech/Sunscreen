import Input from './input';
const EVENT_TYPE = 'contextmenu';
export default class ContextmenuInput extends Input {
    constructor(element, callback, options) {
        super(element, callback, options);
        this.handleEvent = (event) => {
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
                target: event.target
            });
        };
        element.addEventListener('contextmenu', this.handleEvent);
    }
    destroy() {
        this.element.removeEventListener('contextmenu', this.handleEvent);
    }
    /**
     * Enable this input (begin processing events)
     * if the specified event type is among those handled by this input.
     */
    enableEventType(eventType, enabled) {
        if (eventType === EVENT_TYPE) {
            this.options.enable = enabled;
        }
    }
}
//# sourceMappingURL=contextmenu-input.js.map