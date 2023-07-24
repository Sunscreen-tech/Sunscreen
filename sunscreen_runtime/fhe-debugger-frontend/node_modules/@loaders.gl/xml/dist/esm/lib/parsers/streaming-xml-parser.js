import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { SAXParser } from '../../sax-ts/sax';
export class StreamingXMLParser {
  constructor(options) {
    _defineProperty(this, "parser", void 0);
    _defineProperty(this, "result", undefined);
    _defineProperty(this, "previousStates", []);
    _defineProperty(this, "currentState", Object.freeze({
      container: [],
      key: null
    }));
    this.reset();
    this.parser = new SAXParser({
      onready: () => {
        this.previousStates.length = 0;
        this.currentState.container.length = 0;
      },
      onopentag: _ref => {
        let {
          name,
          attributes,
          isSelfClosing
        } = _ref;
        this._openObject({});
        if (typeof name !== 'undefined') {
          this.parser.emit('onkey', name);
        }
      },
      onkey: name => {
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
      ontext: value => {
        this._pushOrSet(value);
      },
      onerror: error => {
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
    this.currentState = Object.freeze({
      container: [],
      key: null
    });
  }
  write(chunk) {
    this.parser.write(chunk);
  }
  close() {
    this.parser.close();
  }
  _pushOrSet(value) {
    const {
      container,
      key
    } = this.currentState;
    if (key !== null) {
      container[key] = value;
      this.currentState.key = null;
    } else if (Array.isArray(container)) {
      container.push(value);
    } else if (container) {}
  }
  _openArray() {
    let newContainer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    this._pushOrSet(newContainer);
    this.previousStates.push(this.currentState);
    this.currentState = {
      container: newContainer,
      isArray: true,
      key: null
    };
  }
  _closeArray() {
    this.currentState = this.previousStates.pop();
  }
  _openObject() {
    let newContainer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this._pushOrSet(newContainer);
    this.previousStates.push(this.currentState);
    this.currentState = {
      container: newContainer,
      isArray: false,
      key: null
    };
  }
  _closeObject() {
    this.currentState = this.previousStates.pop();
  }
}
//# sourceMappingURL=streaming-xml-parser.js.map