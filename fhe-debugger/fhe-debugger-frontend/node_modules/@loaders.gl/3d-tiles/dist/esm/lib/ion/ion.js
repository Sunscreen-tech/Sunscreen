import { fetchFile } from '@loaders.gl/core';
import { assert } from '@loaders.gl/loader-utils';
const CESIUM_ION_URL = 'https://api.cesium.com/v1/assets';
export async function getIonTilesetMetadata(accessToken, assetId) {
  if (!assetId) {
    const assets = await getIonAssets(accessToken);
    for (const item of assets.items) {
      if (item.type === '3DTILES') {
        assetId = item.id;
      }
    }
  }
  const ionAssetMetadata = await getIonAssetMetadata(accessToken, assetId);
  const {
    type,
    url
  } = ionAssetMetadata;
  assert(type === '3DTILES' && url);
  ionAssetMetadata.headers = {
    Authorization: "Bearer ".concat(ionAssetMetadata.accessToken)
  };
  return ionAssetMetadata;
}
export async function getIonAssets(accessToken) {
  assert(accessToken);
  const url = CESIUM_ION_URL;
  const headers = {
    Authorization: "Bearer ".concat(accessToken)
  };
  const response = await fetchFile(url, {
    fetch: {
      headers
    }
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return await response.json();
}
export async function getIonAssetMetadata(accessToken, assetId) {
  assert(accessToken, assetId);
  const headers = {
    Authorization: "Bearer ".concat(accessToken)
  };
  const url = "".concat(CESIUM_ION_URL, "/").concat(assetId);
  let response = await fetchFile("".concat(url), {
    fetch: {
      headers
    }
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  let metadata = await response.json();
  response = await fetchFile("".concat(url, "/endpoint"), {
    fetch: {
      headers
    }
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const tilesetInfo = await response.json();
  metadata = {
    ...metadata,
    ...tilesetInfo
  };
  return metadata;
}
//# sourceMappingURL=ion.js.map