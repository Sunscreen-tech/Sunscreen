import { extractGeometryInfo } from './extract-geometry-info';
import { geojsonToFlatGeojson } from './geojson-to-flat-geojson';
import { flatGeojsonToBinary } from './flat-geojson-to-binary';
export function geojsonToBinary(features) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    fixRingWinding: true
  };
  const geometryInfo = extractGeometryInfo(features);
  const coordLength = geometryInfo.coordLength;
  const {
    fixRingWinding
  } = options;
  const flatFeatures = geojsonToFlatGeojson(features, {
    coordLength,
    fixRingWinding
  });
  return flatGeojsonToBinary(flatFeatures, geometryInfo, {
    numericPropKeys: options.numericPropKeys,
    PositionDataType: options.PositionDataType || Float32Array
  });
}
//# sourceMappingURL=geojson-to-binary.js.map