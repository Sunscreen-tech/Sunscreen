"use strict";
// @ts-nocheck
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingXMLParser = void 0;
const sax_1 = require("../../sax-ts/sax");
/**
 * StreamingXMLParser builds a JSON object using the events emitted by the SAX parser
 */
class StreamingXMLParser {
    // jsonpath: JSONPath = new JSONPath();
    constructor(options) {
        this.result = undefined;
        this.previousStates = [];
        this.currentState = Object.freeze({ container: [], key: null });
        this.reset();
        this.parser = new sax_1.SAXParser({
            onready: () => {
                this.previousStates.length = 0;
                this.currentState.container.length = 0;
            },
            onopentag: ({ name, attributes, isSelfClosing }) => {
                this._openObject({});
                if (typeof name !== 'undefined') {
                    this.parser.emit('onkey', name);
                }
            },
            onkey: (name) => {
                this.currentState.key = name;
            },
            onclosetag: () => {
                this._closeObject();
            },
            onopenarray: () => {
                this._openArray();
            },
            onclosearray: () => {
                this._closeArray();
            },
            ontext: (value) => {
                this._pushOrSet(value);
            },
            onerror: (error) => {
                throw error;
            },
            onend: () => {
                this.result = this.currentState.container.pop();
            },
            ...options
        });
    }
    reset() {
        this.result = undefined;
        this.previousStates = [];
        this.currentState = Object.freeze({ container: [], key: null });
    }
    write(chunk) {
        this.parser.write(chunk);
    }
    close() {
        this.parser.close();
    }
    // PRIVATE METHODS
    _pushOrSet(value) {
        const { container, key } = this.currentState;
        if (key !== null) {
            container[key] = value;
            this.currentState.key = null;
        }
        else if (Array.isArray(container)) {
            container.push(value);
        }
        else if (container) {
            // debugger
        }
    }
    _openArray(newContainer = []) {
        // this.jsonpath.push(null);
        this._pushOrSet(newContainer);
        this.previousStates.push(this.currentState);
        this.currentState = { container: newContainer, isArray: true, key: null };
    }
    _closeArray() {
        // this.jsonpath.pop();
        this.currentState = this.previousStates.pop();
    }
    _openObject(newContainer = {}) {
        // this.jsonpath.push(null);
        this._pushOrSet(newContainer);
        this.previousStates.push(this.currentState);
        this.currentState = { container: newContainer, isArray: false, key: null };
    }
    _closeObject() {
        // this.jsonpath.pop();
        this.currentState = this.previousStates.pop();
    }
}
exports.StreamingXMLParser = StreamingXMLParser;
