"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _core = require("@deck.gl/core");

var _core2 = require("@luma.gl/core");

var _polygon = require("@math.gl/polygon");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var ColumnGeometry = function (_Geometry) {
  (0, _inherits2.default)(ColumnGeometry, _Geometry);

  var _super = _createSuper(ColumnGeometry);

  function ColumnGeometry(props) {
    (0, _classCallCheck2.default)(this, ColumnGeometry);
    var _props$id = props.id,
        id = _props$id === void 0 ? (0, _core2.uid)('column-geometry') : _props$id;

    var _tesselateColumn = tesselateColumn(props),
        indices = _tesselateColumn.indices,
        attributes = _tesselateColumn.attributes;

    return _super.call(this, _objectSpread(_objectSpread({}, props), {}, {
      id: id,
      indices: indices,
      attributes: attributes
    }));
  }

  return ColumnGeometry;
}(_core2.Geometry);

exports.default = ColumnGeometry;

function tesselateColumn(props) {
  var radius = props.radius,
      _props$height = props.height,
      height = _props$height === void 0 ? 1 : _props$height,
      _props$nradial = props.nradial,
      nradial = _props$nradial === void 0 ? 10 : _props$nradial;
  var vertices = props.vertices;

  if (vertices) {
    _core.log.assert(vertices.length >= nradial);

    vertices = vertices.flatMap(function (v) {
      return [v[0], v[1]];
    });
    (0, _polygon.modifyPolygonWindingDirection)(vertices, _polygon.WINDING.COUNTER_CLOCKWISE);
  }

  var isExtruded = height > 0;
  var vertsAroundEdge = nradial + 1;
  var numVertices = isExtruded ? vertsAroundEdge * 3 + 1 : nradial;
  var stepAngle = Math.PI * 2 / nradial;
  var indices = new Uint16Array(isExtruded ? nradial * 3 * 2 : 0);
  var positions = new Float32Array(numVertices * 3);
  var normals = new Float32Array(numVertices * 3);
  var i = 0;

  if (isExtruded) {
    for (var j = 0; j < vertsAroundEdge; j++) {
      var a = j * stepAngle;
      var vertexIndex = j % nradial;
      var sin = Math.sin(a);
      var cos = Math.cos(a);

      for (var k = 0; k < 2; k++) {
        positions[i + 0] = vertices ? vertices[vertexIndex * 2] : cos * radius;
        positions[i + 1] = vertices ? vertices[vertexIndex * 2 + 1] : sin * radius;
        positions[i + 2] = (1 / 2 - k) * height;
        normals[i + 0] = vertices ? vertices[vertexIndex * 2] : cos;
        normals[i + 1] = vertices ? vertices[vertexIndex * 2 + 1] : sin;
        i += 3;
      }
    }

    positions[i + 0] = positions[i - 3];
    positions[i + 1] = positions[i - 2];
    positions[i + 2] = positions[i - 1];
    i += 3;
  }

  for (var _j = isExtruded ? 0 : 1; _j < vertsAroundEdge; _j++) {
    var v = Math.floor(_j / 2) * Math.sign(0.5 - _j % 2);

    var _a = v * stepAngle;

    var _vertexIndex = (v + nradial) % nradial;

    var _sin = Math.sin(_a);

    var _cos = Math.cos(_a);

    positions[i + 0] = vertices ? vertices[_vertexIndex * 2] : _cos * radius;
    positions[i + 1] = vertices ? vertices[_vertexIndex * 2 + 1] : _sin * radius;
    positions[i + 2] = height / 2;
    normals[i + 2] = 1;
    i += 3;
  }

  if (isExtruded) {
    var index = 0;

    for (var _j2 = 0; _j2 < nradial; _j2++) {
      indices[index++] = _j2 * 2 + 0;
      indices[index++] = _j2 * 2 + 2;
      indices[index++] = _j2 * 2 + 0;
      indices[index++] = _j2 * 2 + 1;
      indices[index++] = _j2 * 2 + 1;
      indices[index++] = _j2 * 2 + 3;
    }
  }

  return {
    indices: indices,
    attributes: {
      POSITION: {
        size: 3,
        value: positions
      },
      NORMAL: {
        size: 3,
        value: normals
      }
    }
  };
}
//# sourceMappingURL=column-geometry.js.map