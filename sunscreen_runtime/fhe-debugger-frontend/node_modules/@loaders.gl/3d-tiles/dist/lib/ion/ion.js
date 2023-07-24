"use strict";
// Minimal support to load tilsets from the Cesium ION services
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIonAssetMetadata = exports.getIonAssets = exports.getIonTilesetMetadata = void 0;
const core_1 = require("@loaders.gl/core");
const loader_utils_1 = require("@loaders.gl/loader-utils");
const CESIUM_ION_URL = 'https://api.cesium.com/v1/assets';
// Returns `{url, headers, type, attributions}` for an ion tileset
async function getIonTilesetMetadata(accessToken, assetId) {
    // Step 1, if no asset id, look for first 3DTILES asset associated with this token.
    if (!assetId) {
        const assets = await getIonAssets(accessToken);
        for (const item of assets.items) {
            if (item.type === '3DTILES') {
                assetId = item.id;
            }
        }
    }
    // Step 2: Query metdatadata for this asset.
    const ionAssetMetadata = await getIonAssetMetadata(accessToken, assetId);
    const { type, url } = ionAssetMetadata;
    (0, loader_utils_1.assert)(type === '3DTILES' && url);
    // Prepare a headers object for fetch
    ionAssetMetadata.headers = {
        Authorization: `Bearer ${ionAssetMetadata.accessToken}`
    };
    return ionAssetMetadata;
}
exports.getIonTilesetMetadata = getIonTilesetMetadata;
// Return a list of all assets associated with accessToken
async function getIonAssets(accessToken) {
    (0, loader_utils_1.assert)(accessToken);
    const url = CESIUM_ION_URL;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const response = await (0, core_1.fetchFile)(url, { fetch: { headers } });
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    return await response.json();
}
exports.getIonAssets = getIonAssets;
// Return metadata for a specific asset associated with token
async function getIonAssetMetadata(accessToken, assetId) {
    (0, loader_utils_1.assert)(accessToken, assetId);
    const headers = { Authorization: `Bearer ${accessToken}` };
    const url = `${CESIUM_ION_URL}/${assetId}`;
    // https://cesium.com/docs/rest-api/#operation/getAsset
    // Retrieves metadata information about a specific asset.
    let response = await (0, core_1.fetchFile)(`${url}`, { fetch: { headers } });
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    let metadata = await response.json();
    // https://cesium.com/docs/rest-api/#operation/getAssetEndpoint
    // Retrieves information and credentials that allow you to access the tiled asset data for visualization and analysis.
    response = await (0, core_1.fetchFile)(`${url}/endpoint`, { fetch: { headers } });
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    const tilesetInfo = await response.json();
    // extract dataset description
    metadata = {
        ...metadata,
        ...tilesetInfo
    };
    return metadata;
}
exports.getIonAssetMetadata = getIonAssetMetadata;
