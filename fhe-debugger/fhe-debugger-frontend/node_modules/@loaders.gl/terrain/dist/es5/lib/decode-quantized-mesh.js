"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DECODING_STEPS = void 0;
exports.default = decode;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var QUANTIZED_MESH_HEADER = new Map([['centerX', Float64Array.BYTES_PER_ELEMENT], ['centerY', Float64Array.BYTES_PER_ELEMENT], ['centerZ', Float64Array.BYTES_PER_ELEMENT], ['minHeight', Float32Array.BYTES_PER_ELEMENT], ['maxHeight', Float32Array.BYTES_PER_ELEMENT], ['boundingSphereCenterX', Float64Array.BYTES_PER_ELEMENT], ['boundingSphereCenterY', Float64Array.BYTES_PER_ELEMENT], ['boundingSphereCenterZ', Float64Array.BYTES_PER_ELEMENT], ['boundingSphereRadius', Float64Array.BYTES_PER_ELEMENT], ['horizonOcclusionPointX', Float64Array.BYTES_PER_ELEMENT], ['horizonOcclusionPointY', Float64Array.BYTES_PER_ELEMENT], ['horizonOcclusionPointZ', Float64Array.BYTES_PER_ELEMENT]]);
function decodeZigZag(value) {
  return value >> 1 ^ -(value & 1);
}
function decodeHeader(dataView) {
  var position = 0;
  var header = {};
  var _iterator = _createForOfIteratorHelper(QUANTIZED_MESH_HEADER),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = (0, _slicedToArray2.default)(_step.value, 2),
        key = _step$value[0],
        bytesCount = _step$value[1];
      var getter = bytesCount === 8 ? dataView.getFloat64 : dataView.getFloat32;
      header[key] = getter.call(dataView, position, true);
      position += bytesCount;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return {
    header: header,
    headerEndPosition: position
  };
}
function decodeVertexData(dataView, headerEndPosition) {
  var position = headerEndPosition;
  var elementsPerVertex = 3;
  var vertexCount = dataView.getUint32(position, true);
  var vertexData = new Uint16Array(vertexCount * elementsPerVertex);
  position += Uint32Array.BYTES_PER_ELEMENT;
  var bytesPerArrayElement = Uint16Array.BYTES_PER_ELEMENT;
  var elementArrayLength = vertexCount * bytesPerArrayElement;
  var uArrayStartPosition = position;
  var vArrayStartPosition = uArrayStartPosition + elementArrayLength;
  var heightArrayStartPosition = vArrayStartPosition + elementArrayLength;
  var u = 0;
  var v = 0;
  var height = 0;
  for (var i = 0; i < vertexCount; i++) {
    u += decodeZigZag(dataView.getUint16(uArrayStartPosition + bytesPerArrayElement * i, true));
    v += decodeZigZag(dataView.getUint16(vArrayStartPosition + bytesPerArrayElement * i, true));
    height += decodeZigZag(dataView.getUint16(heightArrayStartPosition + bytesPerArrayElement * i, true));
    vertexData[i] = u;
    vertexData[i + vertexCount] = v;
    vertexData[i + vertexCount * 2] = height;
  }
  position += elementArrayLength * 3;
  return {
    vertexData: vertexData,
    vertexDataEndPosition: position
  };
}
function decodeIndex(buffer, position, indicesCount, bytesPerIndex) {
  var encoded = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;
  var indices;
  if (bytesPerIndex === 2) {
    indices = new Uint16Array(buffer, position, indicesCount);
  } else {
    indices = new Uint32Array(buffer, position, indicesCount);
  }
  if (!encoded) {
    return indices;
  }
  var highest = 0;
  for (var i = 0; i < indices.length; ++i) {
    var code = indices[i];
    indices[i] = highest - code;
    if (code === 0) {
      ++highest;
    }
  }
  return indices;
}
function decodeTriangleIndices(dataView, vertexData, vertexDataEndPosition) {
  var position = vertexDataEndPosition;
  var elementsPerVertex = 3;
  var vertexCount = vertexData.length / elementsPerVertex;
  var bytesPerIndex = vertexCount > 65536 ? Uint32Array.BYTES_PER_ELEMENT : Uint16Array.BYTES_PER_ELEMENT;
  if (position % bytesPerIndex !== 0) {
    position += bytesPerIndex - position % bytesPerIndex;
  }
  var triangleCount = dataView.getUint32(position, true);
  position += Uint32Array.BYTES_PER_ELEMENT;
  var triangleIndicesCount = triangleCount * 3;
  var triangleIndices = decodeIndex(dataView.buffer, position, triangleIndicesCount, bytesPerIndex);
  position += triangleIndicesCount * bytesPerIndex;
  return {
    triangleIndicesEndPosition: position,
    triangleIndices: triangleIndices
  };
}
function decodeEdgeIndices(dataView, vertexData, triangleIndicesEndPosition) {
  var position = triangleIndicesEndPosition;
  var elementsPerVertex = 3;
  var vertexCount = vertexData.length / elementsPerVertex;
  var bytesPerIndex = vertexCount > 65536 ? Uint32Array.BYTES_PER_ELEMENT : Uint16Array.BYTES_PER_ELEMENT;
  var westVertexCount = dataView.getUint32(position, true);
  position += Uint32Array.BYTES_PER_ELEMENT;
  var westIndices = decodeIndex(dataView.buffer, position, westVertexCount, bytesPerIndex, false);
  position += westVertexCount * bytesPerIndex;
  var southVertexCount = dataView.getUint32(position, true);
  position += Uint32Array.BYTES_PER_ELEMENT;
  var southIndices = decodeIndex(dataView.buffer, position, southVertexCount, bytesPerIndex, false);
  position += southVertexCount * bytesPerIndex;
  var eastVertexCount = dataView.getUint32(position, true);
  position += Uint32Array.BYTES_PER_ELEMENT;
  var eastIndices = decodeIndex(dataView.buffer, position, eastVertexCount, bytesPerIndex, false);
  position += eastVertexCount * bytesPerIndex;
  var northVertexCount = dataView.getUint32(position, true);
  position += Uint32Array.BYTES_PER_ELEMENT;
  var northIndices = decodeIndex(dataView.buffer, position, northVertexCount, bytesPerIndex, false);
  position += northVertexCount * bytesPerIndex;
  return {
    edgeIndicesEndPosition: position,
    westIndices: westIndices,
    southIndices: southIndices,
    eastIndices: eastIndices,
    northIndices: northIndices
  };
}
function decodeVertexNormalsExtension(extensionDataView) {
  return new Uint8Array(extensionDataView.buffer, extensionDataView.byteOffset, extensionDataView.byteLength);
}
function decodeWaterMaskExtension(extensionDataView) {
  return extensionDataView.buffer.slice(extensionDataView.byteOffset, extensionDataView.byteOffset + extensionDataView.byteLength);
}
function decodeExtensions(dataView, indicesEndPosition) {
  var extensions = {};
  if (dataView.byteLength <= indicesEndPosition) {
    return {
      extensions: extensions,
      extensionsEndPosition: indicesEndPosition
    };
  }
  var position = indicesEndPosition;
  while (position < dataView.byteLength) {
    var extensionId = dataView.getUint8(position, true);
    position += Uint8Array.BYTES_PER_ELEMENT;
    var extensionLength = dataView.getUint32(position, true);
    position += Uint32Array.BYTES_PER_ELEMENT;
    var extensionView = new DataView(dataView.buffer, position, extensionLength);
    switch (extensionId) {
      case 1:
        {
          extensions.vertexNormals = decodeVertexNormalsExtension(extensionView);
          break;
        }
      case 2:
        {
          extensions.waterMask = decodeWaterMaskExtension(extensionView);
          break;
        }
      default:
        {}
    }
    position += extensionLength;
  }
  return {
    extensions: extensions,
    extensionsEndPosition: position
  };
}
var DECODING_STEPS = {
  header: 0,
  vertices: 1,
  triangleIndices: 2,
  edgeIndices: 3,
  extensions: 4
};
exports.DECODING_STEPS = DECODING_STEPS;
var DEFAULT_OPTIONS = {
  maxDecodingStep: DECODING_STEPS.extensions
};
function decode(data, userOptions) {
  var options = Object.assign({}, DEFAULT_OPTIONS, userOptions);
  var view = new DataView(data);
  var _decodeHeader = decodeHeader(view),
    header = _decodeHeader.header,
    headerEndPosition = _decodeHeader.headerEndPosition;
  if (options.maxDecodingStep < DECODING_STEPS.vertices) {
    return {
      header: header
    };
  }
  var _decodeVertexData = decodeVertexData(view, headerEndPosition),
    vertexData = _decodeVertexData.vertexData,
    vertexDataEndPosition = _decodeVertexData.vertexDataEndPosition;
  if (options.maxDecodingStep < DECODING_STEPS.triangleIndices) {
    return {
      header: header,
      vertexData: vertexData
    };
  }
  var _decodeTriangleIndice = decodeTriangleIndices(view, vertexData, vertexDataEndPosition),
    triangleIndices = _decodeTriangleIndice.triangleIndices,
    triangleIndicesEndPosition = _decodeTriangleIndice.triangleIndicesEndPosition;
  if (options.maxDecodingStep < DECODING_STEPS.edgeIndices) {
    return {
      header: header,
      vertexData: vertexData,
      triangleIndices: triangleIndices
    };
  }
  var _decodeEdgeIndices = decodeEdgeIndices(view, vertexData, triangleIndicesEndPosition),
    westIndices = _decodeEdgeIndices.westIndices,
    southIndices = _decodeEdgeIndices.southIndices,
    eastIndices = _decodeEdgeIndices.eastIndices,
    northIndices = _decodeEdgeIndices.northIndices,
    edgeIndicesEndPosition = _decodeEdgeIndices.edgeIndicesEndPosition;
  if (options.maxDecodingStep < DECODING_STEPS.extensions) {
    return {
      header: header,
      vertexData: vertexData,
      triangleIndices: triangleIndices,
      westIndices: westIndices,
      northIndices: northIndices,
      eastIndices: eastIndices,
      southIndices: southIndices
    };
  }
  var _decodeExtensions = decodeExtensions(view, edgeIndicesEndPosition),
    extensions = _decodeExtensions.extensions;
  return {
    header: header,
    vertexData: vertexData,
    triangleIndices: triangleIndices,
    westIndices: westIndices,
    northIndices: northIndices,
    eastIndices: eastIndices,
    southIndices: southIndices,
    extensions: extensions
  };
}
//# sourceMappingURL=decode-quantized-mesh.js.map