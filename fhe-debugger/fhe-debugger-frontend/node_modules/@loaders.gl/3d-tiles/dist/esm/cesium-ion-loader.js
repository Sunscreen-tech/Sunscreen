import { Tiles3DLoader } from './tiles-3d-loader';
import { getIonTilesetMetadata } from './lib/ion/ion';
async function preload(url) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  options = options['cesium-ion'] || {};
  const {
    accessToken
  } = options;
  let assetId = options.assetId;
  if (!Number.isFinite(assetId)) {
    const matched = url.match(/\/([0-9]+)\/tileset.json/);
    assetId = matched && matched[1];
  }
  return getIonTilesetMetadata(accessToken, assetId);
}
export const CesiumIonLoader = {
  ...Tiles3DLoader,
  id: 'cesium-ion',
  name: 'Cesium Ion',
  preload,
  parse: async (data, options, context) => {
    options = {
      ...options
    };
    options['3d-tiles'] = options['cesium-ion'];
    options.loader = CesiumIonLoader;
    return Tiles3DLoader.parse(data, options, context);
  },
  options: {
    'cesium-ion': {
      ...Tiles3DLoader.options['3d-tiles'],
      accessToken: null
    }
  }
};
//# sourceMappingURL=cesium-ion-loader.js.map