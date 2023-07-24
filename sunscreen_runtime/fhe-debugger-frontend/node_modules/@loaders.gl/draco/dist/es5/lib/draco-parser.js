"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _schema = require("@loaders.gl/schema");
var _getDracoSchema = require("./utils/get-draco-schema");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var GEOMETRY_TYPE = {
  TRIANGULAR_MESH: 0,
  POINT_CLOUD: 1
};
var DRACO_TO_GLTF_ATTRIBUTE_NAME_MAP = {
  POSITION: 'POSITION',
  NORMAL: 'NORMAL',
  COLOR: 'COLOR_0',
  TEX_COORD: 'TEXCOORD_0'
};
var DRACO_DATA_TYPE_TO_TYPED_ARRAY_MAP = {
  1: Int8Array,
  2: Uint8Array,
  3: Int16Array,
  4: Uint16Array,
  5: Int32Array,
  6: Uint32Array,
  9: Float32Array
};
var INDEX_ITEM_SIZE = 4;
var DracoParser = function () {
  function DracoParser(draco) {
    (0, _classCallCheck2.default)(this, DracoParser);
    (0, _defineProperty2.default)(this, "draco", void 0);
    (0, _defineProperty2.default)(this, "decoder", void 0);
    (0, _defineProperty2.default)(this, "metadataQuerier", void 0);
    this.draco = draco;
    this.decoder = new this.draco.Decoder();
    this.metadataQuerier = new this.draco.MetadataQuerier();
  }
  (0, _createClass2.default)(DracoParser, [{
    key: "destroy",
    value: function destroy() {
      this.draco.destroy(this.decoder);
      this.draco.destroy(this.metadataQuerier);
    }
  }, {
    key: "parseSync",
    value: function parseSync(arrayBuffer) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var buffer = new this.draco.DecoderBuffer();
      buffer.Init(new Int8Array(arrayBuffer), arrayBuffer.byteLength);
      this._disableAttributeTransforms(options);
      var geometry_type = this.decoder.GetEncodedGeometryType(buffer);
      var dracoGeometry = geometry_type === this.draco.TRIANGULAR_MESH ? new this.draco.Mesh() : new this.draco.PointCloud();
      try {
        var dracoStatus;
        switch (geometry_type) {
          case this.draco.TRIANGULAR_MESH:
            dracoStatus = this.decoder.DecodeBufferToMesh(buffer, dracoGeometry);
            break;
          case this.draco.POINT_CLOUD:
            dracoStatus = this.decoder.DecodeBufferToPointCloud(buffer, dracoGeometry);
            break;
          default:
            throw new Error('DRACO: Unknown geometry type.');
        }
        if (!dracoStatus.ok() || !dracoGeometry.ptr) {
          var message = "DRACO decompression failed: ".concat(dracoStatus.error_msg());
          throw new Error(message);
        }
        var loaderData = this._getDracoLoaderData(dracoGeometry, geometry_type, options);
        var geometry = this._getMeshData(dracoGeometry, loaderData, options);
        var boundingBox = (0, _schema.getMeshBoundingBox)(geometry.attributes);
        var schema = (0, _getDracoSchema.getDracoSchema)(geometry.attributes, loaderData, geometry.indices);
        var data = _objectSpread(_objectSpread({
          loader: 'draco',
          loaderData: loaderData,
          header: {
            vertexCount: dracoGeometry.num_points(),
            boundingBox: boundingBox
          }
        }, geometry), {}, {
          schema: schema
        });
        return data;
      } finally {
        this.draco.destroy(buffer);
        if (dracoGeometry) {
          this.draco.destroy(dracoGeometry);
        }
      }
    }
  }, {
    key: "_getDracoLoaderData",
    value: function _getDracoLoaderData(dracoGeometry, geometry_type, options) {
      var metadata = this._getTopLevelMetadata(dracoGeometry);
      var attributes = this._getDracoAttributes(dracoGeometry, options);
      return {
        geometry_type: geometry_type,
        num_attributes: dracoGeometry.num_attributes(),
        num_points: dracoGeometry.num_points(),
        num_faces: dracoGeometry instanceof this.draco.Mesh ? dracoGeometry.num_faces() : 0,
        metadata: metadata,
        attributes: attributes
      };
    }
  }, {
    key: "_getDracoAttributes",
    value: function _getDracoAttributes(dracoGeometry, options) {
      var dracoAttributes = {};
      for (var attributeId = 0; attributeId < dracoGeometry.num_attributes(); attributeId++) {
        var dracoAttribute = this.decoder.GetAttribute(dracoGeometry, attributeId);
        var metadata = this._getAttributeMetadata(dracoGeometry, attributeId);
        dracoAttributes[dracoAttribute.unique_id()] = {
          unique_id: dracoAttribute.unique_id(),
          attribute_type: dracoAttribute.attribute_type(),
          data_type: dracoAttribute.data_type(),
          num_components: dracoAttribute.num_components(),
          byte_offset: dracoAttribute.byte_offset(),
          byte_stride: dracoAttribute.byte_stride(),
          normalized: dracoAttribute.normalized(),
          attribute_index: attributeId,
          metadata: metadata
        };
        var quantization = this._getQuantizationTransform(dracoAttribute, options);
        if (quantization) {
          dracoAttributes[dracoAttribute.unique_id()].quantization_transform = quantization;
        }
        var octahedron = this._getOctahedronTransform(dracoAttribute, options);
        if (octahedron) {
          dracoAttributes[dracoAttribute.unique_id()].octahedron_transform = octahedron;
        }
      }
      return dracoAttributes;
    }
  }, {
    key: "_getMeshData",
    value: function _getMeshData(dracoGeometry, loaderData, options) {
      var attributes = this._getMeshAttributes(loaderData, dracoGeometry, options);
      var positionAttribute = attributes.POSITION;
      if (!positionAttribute) {
        throw new Error('DRACO: No position attribute found.');
      }
      if (dracoGeometry instanceof this.draco.Mesh) {
        switch (options.topology) {
          case 'triangle-strip':
            return {
              topology: 'triangle-strip',
              mode: 4,
              attributes: attributes,
              indices: {
                value: this._getTriangleStripIndices(dracoGeometry),
                size: 1
              }
            };
          case 'triangle-list':
          default:
            return {
              topology: 'triangle-list',
              mode: 5,
              attributes: attributes,
              indices: {
                value: this._getTriangleListIndices(dracoGeometry),
                size: 1
              }
            };
        }
      }
      return {
        topology: 'point-list',
        mode: 0,
        attributes: attributes
      };
    }
  }, {
    key: "_getMeshAttributes",
    value: function _getMeshAttributes(loaderData, dracoGeometry, options) {
      var attributes = {};
      for (var _i = 0, _Object$values = Object.values(loaderData.attributes); _i < _Object$values.length; _i++) {
        var loaderAttribute = _Object$values[_i];
        var _attributeName = this._deduceAttributeName(loaderAttribute, options);
        loaderAttribute.name = _attributeName;
        var _this$_getAttributeVa = this._getAttributeValues(dracoGeometry, loaderAttribute),
          value = _this$_getAttributeVa.value,
          size = _this$_getAttributeVa.size;
        attributes[_attributeName] = {
          value: value,
          size: size,
          byteOffset: loaderAttribute.byte_offset,
          byteStride: loaderAttribute.byte_stride,
          normalized: loaderAttribute.normalized
        };
      }
      return attributes;
    }
  }, {
    key: "_getTriangleListIndices",
    value: function _getTriangleListIndices(dracoGeometry) {
      var numFaces = dracoGeometry.num_faces();
      var numIndices = numFaces * 3;
      var byteLength = numIndices * INDEX_ITEM_SIZE;
      var ptr = this.draco._malloc(byteLength);
      try {
        this.decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
        return new Uint32Array(this.draco.HEAPF32.buffer, ptr, numIndices).slice();
      } finally {
        this.draco._free(ptr);
      }
    }
  }, {
    key: "_getTriangleStripIndices",
    value: function _getTriangleStripIndices(dracoGeometry) {
      var dracoArray = new this.draco.DracoInt32Array();
      try {
        this.decoder.GetTriangleStripsFromMesh(dracoGeometry, dracoArray);
        return getUint32Array(dracoArray);
      } finally {
        this.draco.destroy(dracoArray);
      }
    }
  }, {
    key: "_getAttributeValues",
    value: function _getAttributeValues(dracoGeometry, attribute) {
      var TypedArrayCtor = DRACO_DATA_TYPE_TO_TYPED_ARRAY_MAP[attribute.data_type];
      var numComponents = attribute.num_components;
      var numPoints = dracoGeometry.num_points();
      var numValues = numPoints * numComponents;
      var byteLength = numValues * TypedArrayCtor.BYTES_PER_ELEMENT;
      var dataType = getDracoDataType(this.draco, TypedArrayCtor);
      var value;
      var ptr = this.draco._malloc(byteLength);
      try {
        var dracoAttribute = this.decoder.GetAttribute(dracoGeometry, attribute.attribute_index);
        this.decoder.GetAttributeDataArrayForAllPoints(dracoGeometry, dracoAttribute, dataType, byteLength, ptr);
        value = new TypedArrayCtor(this.draco.HEAPF32.buffer, ptr, numValues).slice();
      } finally {
        this.draco._free(ptr);
      }
      return {
        value: value,
        size: numComponents
      };
    }
  }, {
    key: "_deduceAttributeName",
    value: function _deduceAttributeName(attribute, options) {
      var uniqueId = attribute.unique_id;
      for (var _i2 = 0, _Object$entries = Object.entries(options.extraAttributes || {}); _i2 < _Object$entries.length; _i2++) {
        var _Object$entries$_i = (0, _slicedToArray2.default)(_Object$entries[_i2], 2),
          _attributeName2 = _Object$entries$_i[0],
          attributeUniqueId = _Object$entries$_i[1];
        if (attributeUniqueId === uniqueId) {
          return _attributeName2;
        }
      }
      var thisAttributeType = attribute.attribute_type;
      for (var dracoAttributeConstant in DRACO_TO_GLTF_ATTRIBUTE_NAME_MAP) {
        var attributeType = this.draco[dracoAttributeConstant];
        if (attributeType === thisAttributeType) {
          return DRACO_TO_GLTF_ATTRIBUTE_NAME_MAP[dracoAttributeConstant];
        }
      }
      var entryName = options.attributeNameEntry || 'name';
      if (attribute.metadata[entryName]) {
        return attribute.metadata[entryName].string;
      }
      return "CUSTOM_ATTRIBUTE_".concat(uniqueId);
    }
  }, {
    key: "_getTopLevelMetadata",
    value: function _getTopLevelMetadata(dracoGeometry) {
      var dracoMetadata = this.decoder.GetMetadata(dracoGeometry);
      return this._getDracoMetadata(dracoMetadata);
    }
  }, {
    key: "_getAttributeMetadata",
    value: function _getAttributeMetadata(dracoGeometry, attributeId) {
      var dracoMetadata = this.decoder.GetAttributeMetadata(dracoGeometry, attributeId);
      return this._getDracoMetadata(dracoMetadata);
    }
  }, {
    key: "_getDracoMetadata",
    value: function _getDracoMetadata(dracoMetadata) {
      if (!dracoMetadata || !dracoMetadata.ptr) {
        return {};
      }
      var result = {};
      var numEntries = this.metadataQuerier.NumEntries(dracoMetadata);
      for (var entryIndex = 0; entryIndex < numEntries; entryIndex++) {
        var entryName = this.metadataQuerier.GetEntryName(dracoMetadata, entryIndex);
        result[entryName] = this._getDracoMetadataField(dracoMetadata, entryName);
      }
      return result;
    }
  }, {
    key: "_getDracoMetadataField",
    value: function _getDracoMetadataField(dracoMetadata, entryName) {
      var dracoArray = new this.draco.DracoInt32Array();
      try {
        this.metadataQuerier.GetIntEntryArray(dracoMetadata, entryName, dracoArray);
        var intArray = getInt32Array(dracoArray);
        return {
          int: this.metadataQuerier.GetIntEntry(dracoMetadata, entryName),
          string: this.metadataQuerier.GetStringEntry(dracoMetadata, entryName),
          double: this.metadataQuerier.GetDoubleEntry(dracoMetadata, entryName),
          intArray: intArray
        };
      } finally {
        this.draco.destroy(dracoArray);
      }
    }
  }, {
    key: "_disableAttributeTransforms",
    value: function _disableAttributeTransforms(options) {
      var _options$quantizedAtt = options.quantizedAttributes,
        quantizedAttributes = _options$quantizedAtt === void 0 ? [] : _options$quantizedAtt,
        _options$octahedronAt = options.octahedronAttributes,
        octahedronAttributes = _options$octahedronAt === void 0 ? [] : _options$octahedronAt;
      var skipAttributes = [].concat((0, _toConsumableArray2.default)(quantizedAttributes), (0, _toConsumableArray2.default)(octahedronAttributes));
      var _iterator = _createForOfIteratorHelper(skipAttributes),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var dracoAttributeName = _step.value;
          this.decoder.SkipAttributeTransform(this.draco[dracoAttributeName]);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  }, {
    key: "_getQuantizationTransform",
    value: function _getQuantizationTransform(dracoAttribute, options) {
      var _this = this;
      var _options$quantizedAtt2 = options.quantizedAttributes,
        quantizedAttributes = _options$quantizedAtt2 === void 0 ? [] : _options$quantizedAtt2;
      var attribute_type = dracoAttribute.attribute_type();
      var skip = quantizedAttributes.map(function (type) {
        return _this.decoder[type];
      }).includes(attribute_type);
      if (skip) {
        var transform = new this.draco.AttributeQuantizationTransform();
        try {
          if (transform.InitFromAttribute(dracoAttribute)) {
            return {
              quantization_bits: transform.quantization_bits(),
              range: transform.range(),
              min_values: new Float32Array([1, 2, 3]).map(function (i) {
                return transform.min_value(i);
              })
            };
          }
        } finally {
          this.draco.destroy(transform);
        }
      }
      return null;
    }
  }, {
    key: "_getOctahedronTransform",
    value: function _getOctahedronTransform(dracoAttribute, options) {
      var _this2 = this;
      var _options$octahedronAt2 = options.octahedronAttributes,
        octahedronAttributes = _options$octahedronAt2 === void 0 ? [] : _options$octahedronAt2;
      var attribute_type = dracoAttribute.attribute_type();
      var octahedron = octahedronAttributes.map(function (type) {
        return _this2.decoder[type];
      }).includes(attribute_type);
      if (octahedron) {
        var transform = new this.draco.AttributeQuantizationTransform();
        try {
          if (transform.InitFromAttribute(dracoAttribute)) {
            return {
              quantization_bits: transform.quantization_bits()
            };
          }
        } finally {
          this.draco.destroy(transform);
        }
      }
      return null;
    }
  }]);
  return DracoParser;
}();
exports.default = DracoParser;
function getDracoDataType(draco, attributeType) {
  switch (attributeType) {
    case Float32Array:
      return draco.DT_FLOAT32;
    case Int8Array:
      return draco.DT_INT8;
    case Int16Array:
      return draco.DT_INT16;
    case Int32Array:
      return draco.DT_INT32;
    case Uint8Array:
      return draco.DT_UINT8;
    case Uint16Array:
      return draco.DT_UINT16;
    case Uint32Array:
      return draco.DT_UINT32;
    default:
      return draco.DT_INVALID;
  }
}
function getInt32Array(dracoArray) {
  var numValues = dracoArray.size();
  var intArray = new Int32Array(numValues);
  for (var i = 0; i < numValues; i++) {
    intArray[i] = dracoArray.GetValue(i);
  }
  return intArray;
}
function getUint32Array(dracoArray) {
  var numValues = dracoArray.size();
  var intArray = new Int32Array(numValues);
  for (var i = 0; i < numValues; i++) {
    intArray[i] = dracoArray.GetValue(i);
  }
  return intArray;
}
//# sourceMappingURL=draco-parser.js.map