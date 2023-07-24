"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _math = require("@loaders.gl/math");
var Tile3DFeatureTable = function () {
  function Tile3DFeatureTable(featureTableJson, featureTableBinary) {
    (0, _classCallCheck2.default)(this, Tile3DFeatureTable);
    (0, _defineProperty2.default)(this, "json", void 0);
    (0, _defineProperty2.default)(this, "buffer", void 0);
    (0, _defineProperty2.default)(this, "featuresLength", 0);
    (0, _defineProperty2.default)(this, "_cachedTypedArrays", {});
    this.json = featureTableJson;
    this.buffer = featureTableBinary;
  }
  (0, _createClass2.default)(Tile3DFeatureTable, [{
    key: "getExtension",
    value: function getExtension(extensionName) {
      return this.json.extensions && this.json.extensions[extensionName];
    }
  }, {
    key: "hasProperty",
    value: function hasProperty(propertyName) {
      return Boolean(this.json[propertyName]);
    }
  }, {
    key: "getGlobalProperty",
    value: function getGlobalProperty(propertyName) {
      var componentType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _math.GL.UNSIGNED_INT;
      var componentLength = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
      var jsonValue = this.json[propertyName];
      if (jsonValue && Number.isFinite(jsonValue.byteOffset)) {
        return this._getTypedArrayFromBinary(propertyName, componentType, componentLength, 1, jsonValue.byteOffset);
      }
      return jsonValue;
    }
  }, {
    key: "getPropertyArray",
    value: function getPropertyArray(propertyName, componentType, componentLength) {
      var jsonValue = this.json[propertyName];
      if (jsonValue && Number.isFinite(jsonValue.byteOffset)) {
        if ('componentType' in jsonValue) {
          componentType = _math.GLType.fromName(jsonValue.componentType);
        }
        return this._getTypedArrayFromBinary(propertyName, componentType, componentLength, this.featuresLength, jsonValue.byteOffset);
      }
      return this._getTypedArrayFromArray(propertyName, componentType, jsonValue);
    }
  }, {
    key: "getProperty",
    value: function getProperty(propertyName, componentType, componentLength, featureId, result) {
      var jsonValue = this.json[propertyName];
      if (!jsonValue) {
        return jsonValue;
      }
      var typedArray = this.getPropertyArray(propertyName, componentType, componentLength);
      if (componentLength === 1) {
        return typedArray[featureId];
      }
      for (var i = 0; i < componentLength; ++i) {
        result[i] = typedArray[componentLength * featureId + i];
      }
      return result;
    }
  }, {
    key: "_getTypedArrayFromBinary",
    value: function _getTypedArrayFromBinary(propertyName, componentType, componentLength, count, byteOffset) {
      var cachedTypedArrays = this._cachedTypedArrays;
      var typedArray = cachedTypedArrays[propertyName];
      if (!typedArray) {
        typedArray = _math.GLType.createTypedArray(componentType, this.buffer.buffer, this.buffer.byteOffset + byteOffset, count * componentLength);
        cachedTypedArrays[propertyName] = typedArray;
      }
      return typedArray;
    }
  }, {
    key: "_getTypedArrayFromArray",
    value: function _getTypedArrayFromArray(propertyName, componentType, array) {
      var cachedTypedArrays = this._cachedTypedArrays;
      var typedArray = cachedTypedArrays[propertyName];
      if (!typedArray) {
        typedArray = _math.GLType.createTypedArray(componentType, array);
        cachedTypedArrays[propertyName] = typedArray;
      }
      return typedArray;
    }
  }]);
  return Tile3DFeatureTable;
}();
exports.default = Tile3DFeatureTable;
//# sourceMappingURL=tile-3d-feature-table.js.map