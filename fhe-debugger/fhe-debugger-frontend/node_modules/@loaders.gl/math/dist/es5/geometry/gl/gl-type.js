"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _constants = require("../constants");
var _GL_TYPE_TO_ARRAY_TYP;
var GL_TYPE_TO_ARRAY_TYPE = (_GL_TYPE_TO_ARRAY_TYP = {}, (0, _defineProperty2.default)(_GL_TYPE_TO_ARRAY_TYP, _constants.GL_TYPE.DOUBLE, Float64Array), (0, _defineProperty2.default)(_GL_TYPE_TO_ARRAY_TYP, _constants.GL_TYPE.FLOAT, Float32Array), (0, _defineProperty2.default)(_GL_TYPE_TO_ARRAY_TYP, _constants.GL_TYPE.UNSIGNED_SHORT, Uint16Array), (0, _defineProperty2.default)(_GL_TYPE_TO_ARRAY_TYP, _constants.GL_TYPE.UNSIGNED_INT, Uint32Array), (0, _defineProperty2.default)(_GL_TYPE_TO_ARRAY_TYP, _constants.GL_TYPE.UNSIGNED_BYTE, Uint8Array), (0, _defineProperty2.default)(_GL_TYPE_TO_ARRAY_TYP, _constants.GL_TYPE.BYTE, Int8Array), (0, _defineProperty2.default)(_GL_TYPE_TO_ARRAY_TYP, _constants.GL_TYPE.SHORT, Int16Array), (0, _defineProperty2.default)(_GL_TYPE_TO_ARRAY_TYP, _constants.GL_TYPE.INT, Int32Array), _GL_TYPE_TO_ARRAY_TYP);
var NAME_TO_GL_TYPE = {
  DOUBLE: _constants.GL_TYPE.DOUBLE,
  FLOAT: _constants.GL_TYPE.FLOAT,
  UNSIGNED_SHORT: _constants.GL_TYPE.UNSIGNED_SHORT,
  UNSIGNED_INT: _constants.GL_TYPE.UNSIGNED_INT,
  UNSIGNED_BYTE: _constants.GL_TYPE.UNSIGNED_BYTE,
  BYTE: _constants.GL_TYPE.BYTE,
  SHORT: _constants.GL_TYPE.SHORT,
  INT: _constants.GL_TYPE.INT
};
var ERR_TYPE_CONVERSION = 'Failed to convert GL type';
var GLType = function () {
  function GLType() {
    (0, _classCallCheck2.default)(this, GLType);
  }
  (0, _createClass2.default)(GLType, null, [{
    key: "fromTypedArray",
    value: function fromTypedArray(arrayOrType) {
      arrayOrType = ArrayBuffer.isView(arrayOrType) ? arrayOrType.constructor : arrayOrType;
      for (var glType in GL_TYPE_TO_ARRAY_TYPE) {
        var ArrayType = GL_TYPE_TO_ARRAY_TYPE[glType];
        if (ArrayType === arrayOrType) {
          return glType;
        }
      }
      throw new Error(ERR_TYPE_CONVERSION);
    }
  }, {
    key: "fromName",
    value: function fromName(name) {
      var glType = NAME_TO_GL_TYPE[name];
      if (!glType) {
        throw new Error(ERR_TYPE_CONVERSION);
      }
      return glType;
    }
  }, {
    key: "getArrayType",
    value: function getArrayType(glType) {
      switch (glType) {
        case _constants.GL_TYPE.UNSIGNED_SHORT_5_6_5:
        case _constants.GL_TYPE.UNSIGNED_SHORT_4_4_4_4:
        case _constants.GL_TYPE.UNSIGNED_SHORT_5_5_5_1:
          return Uint16Array;
        default:
          var ArrayType = GL_TYPE_TO_ARRAY_TYPE[glType];
          if (!ArrayType) {
            throw new Error(ERR_TYPE_CONVERSION);
          }
          return ArrayType;
      }
    }
  }, {
    key: "getByteSize",
    value: function getByteSize(glType) {
      var ArrayType = GLType.getArrayType(glType);
      return ArrayType.BYTES_PER_ELEMENT;
    }
  }, {
    key: "validate",
    value: function validate(glType) {
      return Boolean(GLType.getArrayType(glType));
    }
  }, {
    key: "createTypedArray",
    value: function createTypedArray(glType, buffer) {
      var byteOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var length = arguments.length > 3 ? arguments[3] : undefined;
      if (length === undefined) {
        length = (buffer.byteLength - byteOffset) / GLType.getByteSize(glType);
      }
      var ArrayType = GLType.getArrayType(glType);
      return new ArrayType(buffer, byteOffset, length);
    }
  }]);
  return GLType;
}();
exports.default = GLType;
//# sourceMappingURL=gl-type.js.map