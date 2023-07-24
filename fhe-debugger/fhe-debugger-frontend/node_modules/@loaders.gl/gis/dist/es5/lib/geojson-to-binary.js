"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.geojsonToBinary = geojsonToBinary;
var _extractGeometryInfo = require("./extract-geometry-info");
var _geojsonToFlatGeojson = require("./geojson-to-flat-geojson");
var _flatGeojsonToBinary = require("./flat-geojson-to-binary");
function geojsonToBinary(features) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    fixRingWinding: true
  };
  var geometryInfo = (0, _extractGeometryInfo.extractGeometryInfo)(features);
  var coordLength = geometryInfo.coordLength;
  var fixRingWinding = options.fixRingWinding;
  var flatFeatures = (0, _geojsonToFlatGeojson.geojsonToFlatGeojson)(features, {
    coordLength: coordLength,
    fixRingWinding: fixRingWinding
  });
  return (0, _flatGeojsonToBinary.flatGeojsonToBinary)(flatFeatures, geometryInfo, {
    numericPropKeys: options.numericPropKeys,
    PositionDataType: options.PositionDataType || Float32Array
  });
}
//# sourceMappingURL=geojson-to-binary.js.map