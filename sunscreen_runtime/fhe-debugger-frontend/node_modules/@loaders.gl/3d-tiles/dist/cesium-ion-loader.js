"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CesiumIonLoader = void 0;
const tiles_3d_loader_1 = require("./tiles-3d-loader");
const ion_1 = require("./lib/ion/ion");
async function preload(url, options = {}) {
    options = options['cesium-ion'] || {};
    // @ts-ignore
    const { accessToken } = options;
    // @ts-ignore
    let assetId = options.assetId;
    if (!Number.isFinite(assetId)) {
        const matched = url.match(/\/([0-9]+)\/tileset.json/);
        assetId = matched && matched[1];
    }
    return (0, ion_1.getIonTilesetMetadata)(accessToken, assetId);
}
/**
 * Loader for 3D tiles from Cesium ION
 */
exports.CesiumIonLoader = {
    ...tiles_3d_loader_1.Tiles3DLoader,
    id: 'cesium-ion',
    name: 'Cesium Ion',
    // @ts-ignore
    preload,
    parse: async (data, options, context) => {
        options = { ...options };
        options['3d-tiles'] = options['cesium-ion'];
        // @ts-ignore
        options.loader = exports.CesiumIonLoader;
        return tiles_3d_loader_1.Tiles3DLoader.parse(data, options, context); // , loader);
    },
    options: {
        'cesium-ion': {
            // @ts-expect-error
            ...tiles_3d_loader_1.Tiles3DLoader.options['3d-tiles'],
            accessToken: null
        }
    }
};
