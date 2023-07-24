"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var GLTF_TO_DRACO_ATTRIBUTE_NAME_MAP = {
  POSITION: 'POSITION',
  NORMAL: 'NORMAL',
  COLOR_0: 'COLOR',
  TEXCOORD_0: 'TEX_COORD'
};
var noop = function noop() {};
var DracoBuilder = function () {
  function DracoBuilder(draco) {
    (0, _classCallCheck2.default)(this, DracoBuilder);
    (0, _defineProperty2.default)(this, "draco", void 0);
    (0, _defineProperty2.default)(this, "dracoEncoder", void 0);
    (0, _defineProperty2.default)(this, "dracoMeshBuilder", void 0);
    (0, _defineProperty2.default)(this, "dracoMetadataBuilder", void 0);
    (0, _defineProperty2.default)(this, "log", void 0);
    this.draco = draco;
    this.dracoEncoder = new this.draco.Encoder();
    this.dracoMeshBuilder = new this.draco.MeshBuilder();
    this.dracoMetadataBuilder = new this.draco.MetadataBuilder();
  }
  (0, _createClass2.default)(DracoBuilder, [{
    key: "destroy",
    value: function destroy() {
      this.destroyEncodedObject(this.dracoMeshBuilder);
      this.destroyEncodedObject(this.dracoEncoder);
      this.destroyEncodedObject(this.dracoMetadataBuilder);
      this.dracoMeshBuilder = null;
      this.dracoEncoder = null;
      this.draco = null;
    }
  }, {
    key: "destroyEncodedObject",
    value: function destroyEncodedObject(object) {
      if (object) {
        this.draco.destroy(object);
      }
    }
  }, {
    key: "encodeSync",
    value: function encodeSync(mesh) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      this.log = noop;
      this._setOptions(options);
      return options.pointcloud ? this._encodePointCloud(mesh, options) : this._encodeMesh(mesh, options);
    }
  }, {
    key: "_getAttributesFromMesh",
    value: function _getAttributesFromMesh(mesh) {
      var attributes = _objectSpread(_objectSpread({}, mesh), mesh.attributes);
      if (mesh.indices) {
        attributes.indices = mesh.indices;
      }
      return attributes;
    }
  }, {
    key: "_encodePointCloud",
    value: function _encodePointCloud(pointcloud, options) {
      var dracoPointCloud = new this.draco.PointCloud();
      if (options.metadata) {
        this._addGeometryMetadata(dracoPointCloud, options.metadata);
      }
      var attributes = this._getAttributesFromMesh(pointcloud);
      this._createDracoPointCloud(dracoPointCloud, attributes, options);
      var dracoData = new this.draco.DracoInt8Array();
      try {
        var encodedLen = this.dracoEncoder.EncodePointCloudToDracoBuffer(dracoPointCloud, false, dracoData);
        if (!(encodedLen > 0)) {
          throw new Error('Draco encoding failed.');
        }
        this.log("DRACO encoded ".concat(dracoPointCloud.num_points(), " points\n        with ").concat(dracoPointCloud.num_attributes(), " attributes into ").concat(encodedLen, " bytes"));
        return dracoInt8ArrayToArrayBuffer(dracoData);
      } finally {
        this.destroyEncodedObject(dracoData);
        this.destroyEncodedObject(dracoPointCloud);
      }
    }
  }, {
    key: "_encodeMesh",
    value: function _encodeMesh(mesh, options) {
      var dracoMesh = new this.draco.Mesh();
      if (options.metadata) {
        this._addGeometryMetadata(dracoMesh, options.metadata);
      }
      var attributes = this._getAttributesFromMesh(mesh);
      this._createDracoMesh(dracoMesh, attributes, options);
      var dracoData = new this.draco.DracoInt8Array();
      try {
        var encodedLen = this.dracoEncoder.EncodeMeshToDracoBuffer(dracoMesh, dracoData);
        if (encodedLen <= 0) {
          throw new Error('Draco encoding failed.');
        }
        this.log("DRACO encoded ".concat(dracoMesh.num_points(), " points\n        with ").concat(dracoMesh.num_attributes(), " attributes into ").concat(encodedLen, " bytes"));
        return dracoInt8ArrayToArrayBuffer(dracoData);
      } finally {
        this.destroyEncodedObject(dracoData);
        this.destroyEncodedObject(dracoMesh);
      }
    }
  }, {
    key: "_setOptions",
    value: function _setOptions(options) {
      if ('speed' in options) {
        var _this$dracoEncoder;
        (_this$dracoEncoder = this.dracoEncoder).SetSpeedOptions.apply(_this$dracoEncoder, (0, _toConsumableArray2.default)(options.speed));
      }
      if ('method' in options) {
        var dracoMethod = this.draco[options.method || 'MESH_SEQUENTIAL_ENCODING'];
        this.dracoEncoder.SetEncodingMethod(dracoMethod);
      }
      if ('quantization' in options) {
        for (var attribute in options.quantization) {
          var bits = options.quantization[attribute];
          var dracoPosition = this.draco[attribute];
          this.dracoEncoder.SetAttributeQuantization(dracoPosition, bits);
        }
      }
    }
  }, {
    key: "_createDracoMesh",
    value: function _createDracoMesh(dracoMesh, attributes, options) {
      var optionalMetadata = options.attributesMetadata || {};
      try {
        var positions = this._getPositionAttribute(attributes);
        if (!positions) {
          throw new Error('positions');
        }
        var vertexCount = positions.length / 3;
        for (var _attributeName in attributes) {
          var attribute = attributes[_attributeName];
          _attributeName = GLTF_TO_DRACO_ATTRIBUTE_NAME_MAP[_attributeName] || _attributeName;
          var uniqueId = this._addAttributeToMesh(dracoMesh, _attributeName, attribute, vertexCount);
          if (uniqueId !== -1) {
            this._addAttributeMetadata(dracoMesh, uniqueId, _objectSpread({
              name: _attributeName
            }, optionalMetadata[_attributeName] || {}));
          }
        }
      } catch (error) {
        this.destroyEncodedObject(dracoMesh);
        throw error;
      }
      return dracoMesh;
    }
  }, {
    key: "_createDracoPointCloud",
    value: function _createDracoPointCloud(dracoPointCloud, attributes, options) {
      var optionalMetadata = options.attributesMetadata || {};
      try {
        var positions = this._getPositionAttribute(attributes);
        if (!positions) {
          throw new Error('positions');
        }
        var vertexCount = positions.length / 3;
        for (var _attributeName2 in attributes) {
          var attribute = attributes[_attributeName2];
          _attributeName2 = GLTF_TO_DRACO_ATTRIBUTE_NAME_MAP[_attributeName2] || _attributeName2;
          var uniqueId = this._addAttributeToMesh(dracoPointCloud, _attributeName2, attribute, vertexCount);
          if (uniqueId !== -1) {
            this._addAttributeMetadata(dracoPointCloud, uniqueId, _objectSpread({
              name: _attributeName2
            }, optionalMetadata[_attributeName2] || {}));
          }
        }
      } catch (error) {
        this.destroyEncodedObject(dracoPointCloud);
        throw error;
      }
      return dracoPointCloud;
    }
  }, {
    key: "_addAttributeToMesh",
    value: function _addAttributeToMesh(mesh, attributeName, attribute, vertexCount) {
      if (!ArrayBuffer.isView(attribute)) {
        return -1;
      }
      var type = this._getDracoAttributeType(attributeName);
      var size = attribute.length / vertexCount;
      if (type === 'indices') {
        var numFaces = attribute.length / 3;
        this.log("Adding attribute ".concat(attributeName, ", size ").concat(numFaces));
        this.dracoMeshBuilder.AddFacesToMesh(mesh, numFaces, attribute);
        return -1;
      }
      this.log("Adding attribute ".concat(attributeName, ", size ").concat(size));
      var builder = this.dracoMeshBuilder;
      var buffer = attribute.buffer;
      switch (attribute.constructor) {
        case Int8Array:
          return builder.AddInt8Attribute(mesh, type, vertexCount, size, new Int8Array(buffer));
        case Int16Array:
          return builder.AddInt16Attribute(mesh, type, vertexCount, size, new Int16Array(buffer));
        case Int32Array:
          return builder.AddInt32Attribute(mesh, type, vertexCount, size, new Int32Array(buffer));
        case Uint8Array:
        case Uint8ClampedArray:
          return builder.AddUInt8Attribute(mesh, type, vertexCount, size, new Uint8Array(buffer));
        case Uint16Array:
          return builder.AddUInt16Attribute(mesh, type, vertexCount, size, new Uint16Array(buffer));
        case Uint32Array:
          return builder.AddUInt32Attribute(mesh, type, vertexCount, size, new Uint32Array(buffer));
        case Float32Array:
        default:
          return builder.AddFloatAttribute(mesh, type, vertexCount, size, new Float32Array(buffer));
      }
    }
  }, {
    key: "_getDracoAttributeType",
    value: function _getDracoAttributeType(attributeName) {
      switch (attributeName.toLowerCase()) {
        case 'indices':
          return 'indices';
        case 'position':
        case 'positions':
        case 'vertices':
          return this.draco.POSITION;
        case 'normal':
        case 'normals':
          return this.draco.NORMAL;
        case 'color':
        case 'colors':
          return this.draco.COLOR;
        case 'texcoord':
        case 'texcoords':
          return this.draco.TEX_COORD;
        default:
          return this.draco.GENERIC;
      }
    }
  }, {
    key: "_getPositionAttribute",
    value: function _getPositionAttribute(attributes) {
      for (var _attributeName3 in attributes) {
        var attribute = attributes[_attributeName3];
        var dracoType = this._getDracoAttributeType(_attributeName3);
        if (dracoType === this.draco.POSITION) {
          return attribute;
        }
      }
      return null;
    }
  }, {
    key: "_addGeometryMetadata",
    value: function _addGeometryMetadata(dracoGeometry, metadata) {
      var dracoMetadata = new this.draco.Metadata();
      this._populateDracoMetadata(dracoMetadata, metadata);
      this.dracoMeshBuilder.AddMetadata(dracoGeometry, dracoMetadata);
    }
  }, {
    key: "_addAttributeMetadata",
    value: function _addAttributeMetadata(dracoGeometry, uniqueAttributeId, metadata) {
      var dracoAttributeMetadata = new this.draco.Metadata();
      this._populateDracoMetadata(dracoAttributeMetadata, metadata);
      this.dracoMeshBuilder.SetMetadataForAttribute(dracoGeometry, uniqueAttributeId, dracoAttributeMetadata);
    }
  }, {
    key: "_populateDracoMetadata",
    value: function _populateDracoMetadata(dracoMetadata, metadata) {
      var _iterator = _createForOfIteratorHelper(getEntries(metadata)),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var _step$value = (0, _slicedToArray2.default)(_step.value, 2),
            _key = _step$value[0],
            value = _step$value[1];
          switch ((0, _typeof2.default)(value)) {
            case 'number':
              if (Math.trunc(value) === value) {
                this.dracoMetadataBuilder.AddIntEntry(dracoMetadata, _key, value);
              } else {
                this.dracoMetadataBuilder.AddDoubleEntry(dracoMetadata, _key, value);
              }
              break;
            case 'object':
              if (value instanceof Int32Array) {
                this.dracoMetadataBuilder.AddIntEntryArray(dracoMetadata, _key, value, value.length);
              }
              break;
            case 'string':
            default:
              this.dracoMetadataBuilder.AddStringEntry(dracoMetadata, _key, value);
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  }]);
  return DracoBuilder;
}();
exports.default = DracoBuilder;
function dracoInt8ArrayToArrayBuffer(dracoData) {
  var byteLength = dracoData.size();
  var outputBuffer = new ArrayBuffer(byteLength);
  var outputData = new Int8Array(outputBuffer);
  for (var i = 0; i < byteLength; ++i) {
    outputData[i] = dracoData.GetValue(i);
  }
  return outputBuffer;
}
function getEntries(container) {
  var hasEntriesFunc = container.entries && !container.hasOwnProperty('entries');
  return hasEntriesFunc ? container.entries() : Object.entries(container);
}
//# sourceMappingURL=draco-builder.js.map