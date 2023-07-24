"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get3dTilesOptions = void 0;
function get3dTilesOptions(tileset) {
    return {
        assetGltfUpAxis: (tileset.asset && tileset.asset.gltfUpAxis) || 'Y'
    };
}
exports.get3dTilesOptions = get3dTilesOptions;
