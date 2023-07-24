"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInstancedModel3DTile = void 0;
const core_1 = require("@math.gl/core");
const geospatial_1 = require("@math.gl/geospatial");
const math_1 = require("@loaders.gl/math"); // 'math.gl/geometry';
const tile_3d_feature_table_1 = __importDefault(require("../classes/tile-3d-feature-table"));
const tile_3d_batch_table_1 = __importDefault(require("../classes/tile-3d-batch-table"));
const parse_3d_tile_header_1 = require("./helpers/parse-3d-tile-header");
const parse_3d_tile_tables_1 = require("./helpers/parse-3d-tile-tables");
const parse_3d_tile_gltf_view_1 = require("./helpers/parse-3d-tile-gltf-view");
async function parseInstancedModel3DTile(tile, arrayBuffer, byteOffset, options, context) {
    byteOffset = parseInstancedModel(tile, arrayBuffer, byteOffset, options, context);
    await (0, parse_3d_tile_gltf_view_1.extractGLTF)(tile, tile.gltfFormat, options, context);
    return byteOffset;
}
exports.parseInstancedModel3DTile = parseInstancedModel3DTile;
function parseInstancedModel(tile, arrayBuffer, byteOffset, options, context) {
    byteOffset = (0, parse_3d_tile_header_1.parse3DTileHeaderSync)(tile, arrayBuffer, byteOffset);
    if (tile.version !== 1) {
        throw new Error(`Instanced 3D Model version ${tile.version} is not supported`);
    }
    byteOffset = (0, parse_3d_tile_tables_1.parse3DTileTablesHeaderSync)(tile, arrayBuffer, byteOffset);
    const view = new DataView(arrayBuffer);
    tile.gltfFormat = view.getUint32(byteOffset, true);
    byteOffset += 4;
    // PARSE FEATURE TABLE
    byteOffset = (0, parse_3d_tile_tables_1.parse3DTileTablesSync)(tile, arrayBuffer, byteOffset, options);
    byteOffset = (0, parse_3d_tile_gltf_view_1.parse3DTileGLTFViewSync)(tile, arrayBuffer, byteOffset, options);
    // TODO - Is the feature table sometimes optional or can check be moved into table header parser?
    if (tile.featureTableJsonByteLength === 0) {
        throw new Error('i3dm parser: featureTableJsonByteLength is zero.');
    }
    const featureTable = new tile_3d_feature_table_1.default(tile.featureTableJson, tile.featureTableBinary);
    const instancesLength = featureTable.getGlobalProperty('INSTANCES_LENGTH');
    featureTable.featuresLength = instancesLength;
    if (!Number.isFinite(instancesLength)) {
        throw new Error('i3dm parser: INSTANCES_LENGTH must be defined');
    }
    tile.eastNorthUp = featureTable.getGlobalProperty('EAST_NORTH_UP');
    tile.rtcCenter = featureTable.getGlobalProperty('RTC_CENTER', math_1.GL.FLOAT, 3);
    const batchTable = new tile_3d_batch_table_1.default(tile.batchTableJson, tile.batchTableBinary, instancesLength);
    extractInstancedAttributes(tile, featureTable, batchTable, instancesLength);
    return byteOffset;
}
// eslint-disable-next-line max-statements, complexity
function extractInstancedAttributes(tile, featureTable, batchTable, instancesLength) {
    // Create model instance collection
    const collectionOptions = {
        instances: new Array(instancesLength),
        batchTable: tile._batchTable,
        cull: false,
        url: undefined,
        // requestType: RequestType.TILES3D,
        gltf: undefined,
        basePath: undefined,
        incrementallyLoadTextures: false,
        // TODO - tileset is not available at this stage, tile is parsed independently
        // upAxis: (tileset && tileset._gltfUpAxis) || [0, 1, 0],
        forwardAxis: [1, 0, 0]
    };
    const instances = collectionOptions.instances;
    const instancePosition = new core_1.Vector3();
    const instanceNormalRight = new core_1.Vector3();
    const instanceNormalUp = new core_1.Vector3();
    const instanceNormalForward = new core_1.Vector3();
    const instanceRotation = new core_1.Matrix3();
    const instanceQuaternion = new core_1.Quaternion();
    const instanceScale = new core_1.Vector3();
    const instanceTranslationRotationScale = {};
    const instanceTransform = new core_1.Matrix4();
    const scratch1 = [];
    const scratch2 = [];
    const scratchVector1 = new core_1.Vector3();
    const scratchVector2 = new core_1.Vector3();
    for (let i = 0; i < instancesLength; i++) {
        let position;
        // Get the instance position
        if (featureTable.hasProperty('POSITION')) {
            position = featureTable.getProperty('POSITION', math_1.GL.FLOAT, 3, i, instancePosition);
        }
        else if (featureTable.hasProperty('POSITION_QUANTIZED')) {
            position = featureTable.getProperty('POSITION_QUANTIZED', math_1.GL.UNSIGNED_SHORT, 3, i, instancePosition);
            const quantizedVolumeOffset = featureTable.getGlobalProperty('QUANTIZED_VOLUME_OFFSET', math_1.GL.FLOAT, 3, scratchVector1);
            if (!quantizedVolumeOffset) {
                throw new Error('i3dm parser: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.');
            }
            const quantizedVolumeScale = featureTable.getGlobalProperty('QUANTIZED_VOLUME_SCALE', math_1.GL.FLOAT, 3, scratchVector2);
            if (!quantizedVolumeScale) {
                throw new Error('i3dm parser: QUANTIZED_VOLUME_SCALE must be defined for quantized positions.');
            }
            const MAX_UNSIGNED_SHORT = 65535.0;
            for (let j = 0; j < 3; j++) {
                position[j] =
                    (position[j] / MAX_UNSIGNED_SHORT) * quantizedVolumeScale[j] + quantizedVolumeOffset[j];
            }
        }
        if (!position) {
            throw new Error('i3dm: POSITION or POSITION_QUANTIZED must be defined for each instance.');
        }
        instancePosition.copy(position);
        // @ts-expect-error
        instanceTranslationRotationScale.translation = instancePosition;
        // Get the instance rotation
        tile.normalUp = featureTable.getProperty('NORMAL_UP', math_1.GL.FLOAT, 3, i, scratch1);
        tile.normalRight = featureTable.getProperty('NORMAL_RIGHT', math_1.GL.FLOAT, 3, i, scratch2);
        const hasCustomOrientation = false;
        if (tile.normalUp) {
            if (!tile.normalRight) {
                throw new Error('i3dm: Custom orientation requires both NORMAL_UP and NORMAL_RIGHT.');
            }
            // Vector3.unpack(normalUp, 0, instanceNormalUp);
            // Vector3.unpack(normalRight, 0, instanceNormalRight);
            tile.hasCustomOrientation = true;
        }
        else {
            tile.octNormalUp = featureTable.getProperty('NORMAL_UP_OCT32P', math_1.GL.UNSIGNED_SHORT, 2, scratch1);
            tile.octNormalRight = featureTable.getProperty('NORMAL_RIGHT_OCT32P', math_1.GL.UNSIGNED_SHORT, 2, scratch2);
            if (tile.octNormalUp) {
                if (!tile.octNormalRight) {
                    throw new Error('i3dm: oct-encoded orientation requires NORMAL_UP_OCT32P and NORMAL_RIGHT_OCT32P');
                }
                throw new Error('i3dm: oct-encoded orientation not implemented');
                /*
                AttributeCompression.octDecodeInRange(octNormalUp[0], octNormalUp[1], 65535, instanceNormalUp);
                AttributeCompression.octDecodeInRange(octNormalRight[0], octNormalRight[1], 65535, instanceNormalRight);
                hasCustomOrientation = true;
                */
            }
            else if (tile.eastNorthUp) {
                geospatial_1.Ellipsoid.WGS84.eastNorthUpToFixedFrame(instancePosition, instanceTransform);
                instanceTransform.getRotationMatrix3(instanceRotation);
            }
            else {
                instanceRotation.identity();
            }
        }
        if (hasCustomOrientation) {
            instanceNormalForward.copy(instanceNormalRight).cross(instanceNormalUp).normalize();
            instanceRotation.setColumn(0, instanceNormalRight);
            instanceRotation.setColumn(1, instanceNormalUp);
            instanceRotation.setColumn(2, instanceNormalForward);
        }
        instanceQuaternion.fromMatrix3(instanceRotation);
        // @ts-expect-error
        instanceTranslationRotationScale.rotation = instanceQuaternion;
        // Get the instance scale
        instanceScale.set(1.0, 1.0, 1.0);
        const scale = featureTable.getProperty('SCALE', math_1.GL.FLOAT, 1, i);
        if (Number.isFinite(scale)) {
            instanceScale.multiplyByScalar(scale);
        }
        const nonUniformScale = featureTable.getProperty('SCALE_NON_UNIFORM', math_1.GL.FLOAT, 3, i, scratch1);
        if (nonUniformScale) {
            instanceScale.scale(nonUniformScale);
        }
        // @ts-expect-error
        instanceTranslationRotationScale.scale = instanceScale;
        // Get the batchId
        let batchId = featureTable.getProperty('BATCH_ID', math_1.GL.UNSIGNED_SHORT, 1, i);
        if (batchId === undefined) {
            // If BATCH_ID semantic is undefined, batchId is just the instance number
            batchId = i;
        }
        // @ts-expect-error
        const rotationMatrix = new core_1.Matrix4().fromQuaternion(instanceTranslationRotationScale.rotation);
        // Create the model matrix and the instance
        instanceTransform.identity();
        // @ts-expect-error
        instanceTransform.translate(instanceTranslationRotationScale.translation);
        instanceTransform.multiplyRight(rotationMatrix);
        // @ts-expect-error
        instanceTransform.scale(instanceTranslationRotationScale.scale);
        const modelMatrix = instanceTransform.clone();
        instances[i] = {
            modelMatrix,
            batchId
        };
    }
    tile.instances = instances;
}
