import { DracoLoader } from '@loaders.gl/draco';
import { GL } from '@loaders.gl/math';
import { Vector3 } from '@math.gl/core';
import Tile3DFeatureTable from '../classes/tile-3d-feature-table';
import Tile3DBatchTable from '../classes/tile-3d-batch-table';
import { parse3DTileHeaderSync } from './helpers/parse-3d-tile-header';
import { parse3DTileTablesHeaderSync, parse3DTileTablesSync } from './helpers/parse-3d-tile-tables';
import { normalize3DTileColorAttribute } from './helpers/normalize-3d-tile-colors';
import { normalize3DTileNormalAttribute } from './helpers/normalize-3d-tile-normals';
import { normalize3DTilePositionAttribute } from './helpers/normalize-3d-tile-positions';
export async function parsePointCloud3DTile(tile, arrayBuffer, byteOffset, options, context) {
  byteOffset = parse3DTileHeaderSync(tile, arrayBuffer, byteOffset);
  byteOffset = parse3DTileTablesHeaderSync(tile, arrayBuffer, byteOffset);
  byteOffset = parse3DTileTablesSync(tile, arrayBuffer, byteOffset, options);
  initializeTile(tile);
  const {
    featureTable,
    batchTable
  } = parsePointCloudTables(tile);
  await parseDraco(tile, featureTable, batchTable, options, context);
  parsePositions(tile, featureTable, options);
  parseColors(tile, featureTable, batchTable);
  parseNormals(tile, featureTable);
  return byteOffset;
}
function initializeTile(tile) {
  tile.attributes = {
    positions: null,
    colors: null,
    normals: null,
    batchIds: null
  };
  tile.isQuantized = false;
  tile.isTranslucent = false;
  tile.isRGB565 = false;
  tile.isOctEncoded16P = false;
}
function parsePointCloudTables(tile) {
  const featureTable = new Tile3DFeatureTable(tile.featureTableJson, tile.featureTableBinary);
  const pointsLength = featureTable.getGlobalProperty('POINTS_LENGTH');
  if (!Number.isFinite(pointsLength)) {
    throw new Error('POINTS_LENGTH must be defined');
  }
  featureTable.featuresLength = pointsLength;
  tile.featuresLength = pointsLength;
  tile.pointsLength = pointsLength;
  tile.pointCount = pointsLength;
  tile.rtcCenter = featureTable.getGlobalProperty('RTC_CENTER', GL.FLOAT, 3);
  const batchTable = parseBatchIds(tile, featureTable);
  return {
    featureTable,
    batchTable
  };
}
function parsePositions(tile, featureTable, options) {
  if (!tile.attributes.positions) {
    if (featureTable.hasProperty('POSITION')) {
      tile.attributes.positions = featureTable.getPropertyArray('POSITION', GL.FLOAT, 3);
    } else if (featureTable.hasProperty('POSITION_QUANTIZED')) {
      const positions = featureTable.getPropertyArray('POSITION_QUANTIZED', GL.UNSIGNED_SHORT, 3);
      tile.isQuantized = true;
      tile.quantizedRange = (1 << 16) - 1;
      tile.quantizedVolumeScale = featureTable.getGlobalProperty('QUANTIZED_VOLUME_SCALE', GL.FLOAT, 3);
      if (!tile.quantizedVolumeScale) {
        throw new Error('QUANTIZED_VOLUME_SCALE must be defined for quantized positions.');
      }
      tile.quantizedVolumeOffset = featureTable.getGlobalProperty('QUANTIZED_VOLUME_OFFSET', GL.FLOAT, 3);
      if (!tile.quantizedVolumeOffset) {
        throw new Error('QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.');
      }
      tile.attributes.positions = normalize3DTilePositionAttribute(tile, positions, options);
    }
  }
  if (!tile.attributes.positions) {
    throw new Error('Either POSITION or POSITION_QUANTIZED must be defined.');
  }
}
function parseColors(tile, featureTable, batchTable) {
  if (!tile.attributes.colors) {
    let colors = null;
    if (featureTable.hasProperty('RGBA')) {
      colors = featureTable.getPropertyArray('RGBA', GL.UNSIGNED_BYTE, 4);
      tile.isTranslucent = true;
    } else if (featureTable.hasProperty('RGB')) {
      colors = featureTable.getPropertyArray('RGB', GL.UNSIGNED_BYTE, 3);
    } else if (featureTable.hasProperty('RGB565')) {
      colors = featureTable.getPropertyArray('RGB565', GL.UNSIGNED_SHORT, 1);
      tile.isRGB565 = true;
    }
    tile.attributes.colors = normalize3DTileColorAttribute(tile, colors, batchTable);
  }
  if (featureTable.hasProperty('CONSTANT_RGBA')) {
    tile.constantRGBA = featureTable.getGlobalProperty('CONSTANT_RGBA', GL.UNSIGNED_BYTE, 4);
  }
}
function parseNormals(tile, featureTable) {
  if (!tile.attributes.normals) {
    let normals = null;
    if (featureTable.hasProperty('NORMAL')) {
      normals = featureTable.getPropertyArray('NORMAL', GL.FLOAT, 3);
    } else if (featureTable.hasProperty('NORMAL_OCT16P')) {
      normals = featureTable.getPropertyArray('NORMAL_OCT16P', GL.UNSIGNED_BYTE, 2);
      tile.isOctEncoded16P = true;
    }
    tile.attributes.normals = normalize3DTileNormalAttribute(tile, normals);
  }
}
function parseBatchIds(tile, featureTable) {
  let batchTable = null;
  if (!tile.batchIds && featureTable.hasProperty('BATCH_ID')) {
    tile.batchIds = featureTable.getPropertyArray('BATCH_ID', GL.UNSIGNED_SHORT, 1);
    if (tile.batchIds) {
      const batchFeatureLength = featureTable.getGlobalProperty('BATCH_LENGTH');
      if (!batchFeatureLength) {
        throw new Error('Global property: BATCH_LENGTH must be defined when BATCH_ID is defined.');
      }
      const {
        batchTableJson,
        batchTableBinary
      } = tile;
      batchTable = new Tile3DBatchTable(batchTableJson, batchTableBinary, batchFeatureLength);
    }
  }
  return batchTable;
}
async function parseDraco(tile, featureTable, batchTable, options, context) {
  let dracoBuffer;
  let dracoFeatureTableProperties;
  let dracoBatchTableProperties;
  const batchTableDraco = tile.batchTableJson && tile.batchTableJson.extensions && tile.batchTableJson.extensions['3DTILES_draco_point_compression'];
  if (batchTableDraco) {
    dracoBatchTableProperties = batchTableDraco.properties;
  }
  const featureTableDraco = featureTable.getExtension('3DTILES_draco_point_compression');
  if (featureTableDraco) {
    dracoFeatureTableProperties = featureTableDraco.properties;
    const dracoByteOffset = featureTableDraco.byteOffset;
    const dracoByteLength = featureTableDraco.byteLength;
    if (!dracoFeatureTableProperties || !Number.isFinite(dracoByteOffset) || !dracoByteLength) {
      throw new Error('Draco properties, byteOffset, and byteLength must be defined');
    }
    dracoBuffer = tile.featureTableBinary.slice(dracoByteOffset, dracoByteOffset + dracoByteLength);
    tile.hasPositions = Number.isFinite(dracoFeatureTableProperties.POSITION);
    tile.hasColors = Number.isFinite(dracoFeatureTableProperties.RGB) || Number.isFinite(dracoFeatureTableProperties.RGBA);
    tile.hasNormals = Number.isFinite(dracoFeatureTableProperties.NORMAL);
    tile.hasBatchIds = Number.isFinite(dracoFeatureTableProperties.BATCH_ID);
    tile.isTranslucent = Number.isFinite(dracoFeatureTableProperties.RGBA);
  }
  if (!dracoBuffer) {
    return true;
  }
  const dracoData = {
    buffer: dracoBuffer,
    properties: {
      ...dracoFeatureTableProperties,
      ...dracoBatchTableProperties
    },
    featureTableProperties: dracoFeatureTableProperties,
    batchTableProperties: dracoBatchTableProperties,
    dequantizeInShader: false
  };
  return await loadDraco(tile, dracoData, options, context);
}
export async function loadDraco(tile, dracoData, options, context) {
  const {
    parse
  } = context;
  const dracoOptions = {
    ...options,
    draco: {
      ...options.draco,
      extraAttributes: dracoData.batchTableProperties || {}
    }
  };
  delete dracoOptions['3d-tiles'];
  const data = await parse(dracoData.buffer, DracoLoader, dracoOptions);
  const decodedPositions = data.attributes.POSITION && data.attributes.POSITION.value;
  const decodedColors = data.attributes.COLOR_0 && data.attributes.COLOR_0.value;
  const decodedNormals = data.attributes.NORMAL && data.attributes.NORMAL.value;
  const decodedBatchIds = data.attributes.BATCH_ID && data.attributes.BATCH_ID.value;
  const isQuantizedDraco = decodedPositions && data.attributes.POSITION.value.quantization;
  const isOctEncodedDraco = decodedNormals && data.attributes.NORMAL.value.quantization;
  if (isQuantizedDraco) {
    const quantization = data.POSITION.data.quantization;
    const range = quantization.range;
    tile.quantizedVolumeScale = new Vector3(range, range, range);
    tile.quantizedVolumeOffset = new Vector3(quantization.minValues);
    tile.quantizedRange = (1 << quantization.quantizationBits) - 1.0;
    tile.isQuantizedDraco = true;
  }
  if (isOctEncodedDraco) {
    tile.octEncodedRange = (1 << data.NORMAL.data.quantization.quantizationBits) - 1.0;
    tile.isOctEncodedDraco = true;
  }
  const batchTableAttributes = {};
  if (dracoData.batchTableProperties) {
    for (const attributeName of Object.keys(dracoData.batchTableProperties)) {
      if (data.attributes[attributeName] && data.attributes[attributeName].value) {
        batchTableAttributes[attributeName.toLowerCase()] = data.attributes[attributeName].value;
      }
    }
  }
  tile.attributes = {
    positions: decodedPositions,
    colors: normalize3DTileColorAttribute(tile, decodedColors, undefined),
    normals: decodedNormals,
    batchIds: decodedBatchIds,
    ...batchTableAttributes
  };
}
//# sourceMappingURL=parse-3d-tile-point-cloud.js.map