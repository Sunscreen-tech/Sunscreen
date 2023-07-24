"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StreamingXMLParser = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _sax = require("../../sax-ts/sax");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var StreamingXMLParser = function () {
  function StreamingXMLParser(options) {
    var _this = this;
    (0, _classCallCheck2.default)(this, StreamingXMLParser);
    (0, _defineProperty2.default)(this, "parser", void 0);
    (0, _defineProperty2.default)(this, "result", undefined);
    (0, _defineProperty2.default)(this, "previousStates", []);
    (0, _defineProperty2.default)(this, "currentState", Object.freeze({
      container: [],
      key: null
    }));
    this.reset();
    this.parser = new _sax.SAXParser(_objectSpread({
      onready: function onready() {
        _this.previousStates.length = 0;
        _this.currentState.container.length = 0;
      },
      onopentag: function onopentag(_ref) {
        var name = _ref.name,
          attributes = _ref.attributes,
          isSelfClosing = _ref.isSelfClosing;
        _this._openObject({});
        if (typeof name !== 'undefined') {
          _this.parser.emit('onkey', name);
        }
      },
      onkey: function onkey(name) {
        _this.currentState.key = name;
      },
      onclosetag: function onclosetag() {
        _this._closeObject();
      },
      onopenarray: function onopenarray() {
        _this._openArray();
      },
      onclosearray: function onclosearray() {
        _this._closeArray();
      },
      ontext: function ontext(value) {
        _this._pushOrSet(value);
      },
      onerror: function onerror(error) {
        throw error;
      },
      onend: function onend() {
        _this.result = _this.currentState.container.pop();
      }
    }, options));
  }
  (0, _createClass2.default)(StreamingXMLParser, [{
    key: "reset",
    value: function reset() {
      this.result = undefined;
      this.previousStates = [];
      this.currentState = Object.freeze({
        container: [],
        key: null
      });
    }
  }, {
    key: "write",
    value: function write(chunk) {
      this.parser.write(chunk);
    }
  }, {
    key: "close",
    value: function close() {
      this.parser.close();
    }
  }, {
    key: "_pushOrSet",
    value: function _pushOrSet(value) {
      var _this$currentState = this.currentState,
        container = _this$currentState.container,
        key = _this$currentState.key;
      if (key !== null) {
        container[key] = value;
        this.currentState.key = null;
      } else if (Array.isArray(container)) {
        container.push(value);
      } else if (container) {}
    }
  }, {
    key: "_openArray",
    value: function _openArray() {
      var newContainer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
      this._pushOrSet(newContainer);
      this.previousStates.push(this.currentState);
      this.currentState = {
        container: newContainer,
        isArray: true,
        key: null
      };
    }
  }, {
    key: "_closeArray",
    value: function _closeArray() {
      this.currentState = this.previousStates.pop();
    }
  }, {
    key: "_openObject",
    value: function _openObject() {
      var newContainer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      this._pushOrSet(newContainer);
      this.previousStates.push(this.currentState);
      this.currentState = {
        container: newContainer,
        isArray: false,
        key: null
      };
    }
  }, {
    key: "_closeObject",
    value: function _closeObject() {
      this.currentState = this.previousStates.pop();
    }
  }]);
  return StreamingXMLParser;
}();
exports.StreamingXMLParser = StreamingXMLParser;
//# sourceMappingURL=streaming-xml-parser.js.map