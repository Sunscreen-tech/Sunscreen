"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createLayerPropsFromFeatures = createLayerPropsFromFeatures;
exports.createLayerPropsFromBinary = createLayerPropsFromBinary;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _geojsonBinary = require("./geojson-binary");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function createEmptyLayerProps() {
  return {
    points: {},
    lines: {},
    polygons: {},
    polygonsOutline: {}
  };
}

function getCoordinates(f) {
  return f.geometry.coordinates;
}

function createLayerPropsFromFeatures(features, featuresDiff) {
  var layerProps = createEmptyLayerProps();
  var pointFeatures = features.pointFeatures,
      lineFeatures = features.lineFeatures,
      polygonFeatures = features.polygonFeatures,
      polygonOutlineFeatures = features.polygonOutlineFeatures;
  layerProps.points.data = pointFeatures;

  layerProps.points._dataDiff = featuresDiff.pointFeatures && function () {
    return featuresDiff.pointFeatures;
  };

  layerProps.points.getPosition = getCoordinates;
  layerProps.lines.data = lineFeatures;

  layerProps.lines._dataDiff = featuresDiff.lineFeatures && function () {
    return featuresDiff.lineFeatures;
  };

  layerProps.lines.getPath = getCoordinates;
  layerProps.polygons.data = polygonFeatures;

  layerProps.polygons._dataDiff = featuresDiff.polygonFeatures && function () {
    return featuresDiff.polygonFeatures;
  };

  layerProps.polygons.getPolygon = getCoordinates;
  layerProps.polygonsOutline.data = polygonOutlineFeatures;

  layerProps.polygonsOutline._dataDiff = featuresDiff.polygonOutlineFeatures && function () {
    return featuresDiff.polygonOutlineFeatures;
  };

  layerProps.polygonsOutline.getPath = getCoordinates;
  return layerProps;
}

function createLayerPropsFromBinary(geojsonBinary, encodePickingColor) {
  var layerProps = createEmptyLayerProps();
  var points = geojsonBinary.points,
      lines = geojsonBinary.lines,
      polygons = geojsonBinary.polygons;
  var customPickingColors = (0, _geojsonBinary.calculatePickingColors)(geojsonBinary, encodePickingColor);
  layerProps.points.data = {
    length: points.positions.value.length / points.positions.size,
    attributes: _objectSpread(_objectSpread({}, points.attributes), {}, {
      getPosition: points.positions,
      instancePickingColors: {
        size: 3,
        value: customPickingColors.points
      }
    }),
    properties: points.properties,
    numericProps: points.numericProps,
    featureIds: points.featureIds
  };
  layerProps.lines.data = {
    length: lines.pathIndices.value.length - 1,
    startIndices: lines.pathIndices.value,
    attributes: _objectSpread(_objectSpread({}, lines.attributes), {}, {
      getPath: lines.positions,
      instancePickingColors: {
        size: 3,
        value: customPickingColors.lines
      }
    }),
    properties: lines.properties,
    numericProps: lines.numericProps,
    featureIds: lines.featureIds
  };
  layerProps.lines._pathType = 'open';
  layerProps.polygons.data = {
    length: polygons.polygonIndices.value.length - 1,
    startIndices: polygons.polygonIndices.value,
    attributes: _objectSpread(_objectSpread({}, polygons.attributes), {}, {
      getPolygon: polygons.positions,
      pickingColors: {
        size: 3,
        value: customPickingColors.polygons
      }
    }),
    properties: polygons.properties,
    numericProps: polygons.numericProps,
    featureIds: polygons.featureIds
  };
  layerProps.polygons._normalize = false;

  if (polygons.triangles) {
    layerProps.polygons.data.attributes.indices = polygons.triangles.value;
  }

  layerProps.polygonsOutline.data = {
    length: polygons.primitivePolygonIndices.value.length - 1,
    startIndices: polygons.primitivePolygonIndices.value,
    attributes: _objectSpread(_objectSpread({}, polygons.attributes), {}, {
      getPath: polygons.positions,
      instancePickingColors: {
        size: 3,
        value: customPickingColors.polygons
      }
    }),
    properties: polygons.properties,
    numericProps: polygons.numericProps,
    featureIds: polygons.featureIds
  };
  layerProps.polygonsOutline._pathType = 'open';
  return layerProps;
}
//# sourceMappingURL=geojson-layer-props.js.map