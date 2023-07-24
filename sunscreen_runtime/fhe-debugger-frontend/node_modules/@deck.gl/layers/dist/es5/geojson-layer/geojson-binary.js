"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.binaryToFeatureForAccesor = binaryToFeatureForAccesor;
exports.calculatePickingColors = calculatePickingColors;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function binaryToFeatureForAccesor(data, index) {
  if (!data) {
    return null;
  }

  var featureIndex = 'startIndices' in data ? data.startIndices[index] : index;
  var geometryIndex = data.featureIds.value[featureIndex];

  if (featureIndex !== -1) {
    return getPropertiesForIndex(data, geometryIndex, featureIndex);
  }

  return null;
}

function getPropertiesForIndex(data, propertiesIndex, numericPropsIndex) {
  var feature = {
    properties: _objectSpread({}, data.properties[propertiesIndex])
  };

  for (var prop in data.numericProps) {
    feature.properties[prop] = data.numericProps[prop].value[numericPropsIndex];
  }

  return feature;
}

function calculatePickingColors(geojsonBinary, encodePickingColor) {
  var pickingColors = {
    points: null,
    lines: null,
    polygons: null
  };

  for (var key in pickingColors) {
    var featureIds = geojsonBinary[key].globalFeatureIds.value;
    pickingColors[key] = new Uint8ClampedArray(featureIds.length * 3);
    var pickingColor = [];

    for (var i = 0; i < featureIds.length; i++) {
      encodePickingColor(featureIds[i], pickingColor);
      pickingColors[key][i * 3 + 0] = pickingColor[0];
      pickingColors[key][i * 3 + 1] = pickingColor[1];
      pickingColors[key][i * 3 + 2] = pickingColor[2];
    }
  }

  return pickingColors;
}
//# sourceMappingURL=geojson-binary.js.map