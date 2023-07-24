import { Tile3DSubtreeLoader } from '../../../tile-3d-subtree-loader';
import { load } from '@loaders.gl/core';
import { getS2CellIdFromToken, getS2ChildCellId, getS2TokenFromCellId } from '../../utils/s2/index';
import { convertS2BoundingVolumetoOBB } from '../../utils/obb/s2-corners-to-obb';
const QUADTREE_DEVISION_COUNT = 4;
const OCTREE_DEVISION_COUNT = 8;
const SUBDIVISION_COUNT_MAP = {
  QUADTREE: QUADTREE_DEVISION_COUNT,
  OCTREE: OCTREE_DEVISION_COUNT
};
function getChildS2VolumeBox(s2VolumeBox, index, subdivisionScheme) {
  if (s2VolumeBox !== null && s2VolumeBox !== void 0 && s2VolumeBox.box) {
    const cellId = getS2CellIdFromToken(s2VolumeBox.s2VolumeInfo.token);
    const childCellId = getS2ChildCellId(cellId, index);
    const childToken = getS2TokenFromCellId(childCellId);
    const s2ChildVolumeInfo = {
      ...s2VolumeBox.s2VolumeInfo
    };
    s2ChildVolumeInfo.token = childToken;
    switch (subdivisionScheme) {
      case 'OCTREE':
        const s2VolumeInfo = s2VolumeBox.s2VolumeInfo;
        const delta = s2VolumeInfo.maximumHeight - s2VolumeInfo.minimumHeight;
        const sizeZ = delta / 2.0;
        const midZ = s2VolumeInfo.minimumHeight + delta / 2.0;
        s2VolumeInfo.minimumHeight = midZ - sizeZ;
        s2VolumeInfo.maximumHeight = midZ + sizeZ;
        break;
      default:
        break;
    }
    const box = convertS2BoundingVolumetoOBB(s2ChildVolumeInfo);
    const childS2VolumeBox = {
      box,
      s2VolumeInfo: s2ChildVolumeInfo
    };
    return childS2VolumeBox;
  }
  return undefined;
}
export async function parseImplicitTiles(params) {
  const {
    options,
    parentData = {
      mortonIndex: 0,
      x: 0,
      y: 0,
      z: 0
    },
    childIndex = 0,
    globalData = {
      level: 0,
      mortonIndex: 0,
      x: 0,
      y: 0,
      z: 0
    },
    s2VolumeBox
  } = params;
  let {
    subtree,
    level = 0
  } = params;
  const {
    subdivisionScheme,
    subtreeLevels,
    maximumLevel,
    contentUrlTemplate,
    subtreesUriTemplate,
    basePath
  } = options;
  const tile = {
    children: [],
    lodMetricValue: 0,
    contentUrl: ''
  };
  const childrenPerTile = SUBDIVISION_COUNT_MAP[subdivisionScheme];
  const childX = childIndex & 0b01;
  const childY = childIndex >> 1 & 0b01;
  const childZ = childIndex >> 2 & 0b01;
  const levelOffset = (childrenPerTile ** level - 1) / (childrenPerTile - 1);
  let childTileMortonIndex = concatBits(parentData.mortonIndex, childIndex);
  let tileAvailabilityIndex = levelOffset + childTileMortonIndex;
  let childTileX = concatBits(parentData.x, childX);
  let childTileY = concatBits(parentData.y, childY);
  let childTileZ = concatBits(parentData.z, childZ);
  let isChildSubtreeAvailable = false;
  if (level + 1 > subtreeLevels) {
    isChildSubtreeAvailable = getAvailabilityResult(subtree.childSubtreeAvailability, childTileMortonIndex);
  }
  const x = concatBits(globalData.x, childTileX);
  const y = concatBits(globalData.y, childTileY);
  const z = concatBits(globalData.z, childTileZ);
  const lev = level + globalData.level;
  if (isChildSubtreeAvailable) {
    const subtreePath = "".concat(basePath, "/").concat(subtreesUriTemplate);
    const childSubtreeUrl = replaceContentUrlTemplate(subtreePath, lev, x, y, z);
    const childSubtree = await load(childSubtreeUrl, Tile3DSubtreeLoader);
    subtree = childSubtree;
    globalData.mortonIndex = childTileMortonIndex;
    globalData.x = childTileX;
    globalData.y = childTileY;
    globalData.z = childTileZ;
    globalData.level = level;
    childTileMortonIndex = 0;
    tileAvailabilityIndex = 0;
    childTileX = 0;
    childTileY = 0;
    childTileZ = 0;
    level = 0;
  }
  const isTileAvailable = getAvailabilityResult(subtree.tileAvailability, tileAvailabilityIndex);
  if (!isTileAvailable || level > maximumLevel) {
    return tile;
  }
  const isContentAvailable = getAvailabilityResult(subtree.contentAvailability, tileAvailabilityIndex);
  if (isContentAvailable) {
    tile.contentUrl = replaceContentUrlTemplate(contentUrlTemplate, lev, x, y, z);
  }
  const childTileLevel = level + 1;
  const pData = {
    mortonIndex: childTileMortonIndex,
    x: childTileX,
    y: childTileY,
    z: childTileZ
  };
  for (let index = 0; index < childrenPerTile; index++) {
    const childS2VolumeBox = getChildS2VolumeBox(s2VolumeBox, index, subdivisionScheme);
    const childTileParsed = await parseImplicitTiles({
      subtree,
      options,
      parentData: pData,
      childIndex: index,
      level: childTileLevel,
      globalData,
      s2VolumeBox: childS2VolumeBox
    });
    if (childTileParsed.contentUrl || childTileParsed.children.length) {
      const globalLevel = lev + 1;
      const childCoordinates = {
        childTileX,
        childTileY,
        childTileZ
      };
      const formattedTile = formatTileData(childTileParsed, globalLevel, childCoordinates, options, s2VolumeBox);
      tile.children.push(formattedTile);
    }
  }
  return tile;
}
function getAvailabilityResult(availabilityData, index) {
  if ('constant' in availabilityData) {
    return Boolean(availabilityData.constant);
  }
  if (availabilityData.explicitBitstream) {
    return getBooleanValueFromBitstream(index, availabilityData.explicitBitstream);
  }
  return false;
}
function formatTileData(tile, level, childCoordinates, options, s2VolumeBox) {
  const {
    basePath,
    refine,
    getRefine,
    lodMetricType,
    getTileType,
    rootLodMetricValue,
    rootBoundingVolume
  } = options;
  const uri = tile.contentUrl && tile.contentUrl.replace("".concat(basePath, "/"), '');
  const lodMetricValue = rootLodMetricValue / 2 ** level;
  const boundingVolume = s2VolumeBox !== null && s2VolumeBox !== void 0 && s2VolumeBox.box ? {
    box: s2VolumeBox.box
  } : rootBoundingVolume;
  const boundingVolumeForChildTile = calculateBoundingVolumeForChildTile(level, boundingVolume, childCoordinates);
  return {
    children: tile.children,
    contentUrl: tile.contentUrl,
    content: {
      uri
    },
    id: tile.contentUrl,
    refine: getRefine(refine),
    type: getTileType(tile),
    lodMetricType,
    lodMetricValue,
    geometricError: lodMetricValue,
    transform: tile.transform,
    boundingVolume: boundingVolumeForChildTile
  };
}
function calculateBoundingVolumeForChildTile(level, rootBoundingVolume, childCoordinates) {
  if (rootBoundingVolume.region) {
    const {
      childTileX,
      childTileY,
      childTileZ
    } = childCoordinates;
    const [west, south, east, north, minimumHeight, maximumHeight] = rootBoundingVolume.region;
    const boundingVolumesCount = 2 ** level;
    const sizeX = (east - west) / boundingVolumesCount;
    const sizeY = (north - south) / boundingVolumesCount;
    const sizeZ = (maximumHeight - minimumHeight) / boundingVolumesCount;
    const [childWest, childEast] = [west + sizeX * childTileX, west + sizeX * (childTileX + 1)];
    const [childSouth, childNorth] = [south + sizeY * childTileY, south + sizeY * (childTileY + 1)];
    const [childMinimumHeight, childMaximumHeight] = [minimumHeight + sizeZ * childTileZ, minimumHeight + sizeZ * (childTileZ + 1)];
    return {
      region: [childWest, childSouth, childEast, childNorth, childMinimumHeight, childMaximumHeight]
    };
  }
  if (rootBoundingVolume.box) {
    return rootBoundingVolume;
  }
  throw new Error("Unsupported bounding volume type ".concat(rootBoundingVolume));
}
function concatBits(first, second) {
  return parseInt(first.toString(2) + second.toString(2), 2);
}
export function replaceContentUrlTemplate(templateUrl, level, x, y, z) {
  const mapUrl = generateMapUrl({
    level,
    x,
    y,
    z
  });
  return templateUrl.replace(/{level}|{x}|{y}|{z}/gi, matched => mapUrl[matched]);
}
function generateMapUrl(items) {
  const mapUrl = {};
  for (const key in items) {
    mapUrl["{".concat(key, "}")] = items[key];
  }
  return mapUrl;
}
function getBooleanValueFromBitstream(availabilityIndex, availabilityBuffer) {
  const byteIndex = Math.floor(availabilityIndex / 8);
  const bitIndex = availabilityIndex % 8;
  const bitValue = availabilityBuffer[byteIndex] >> bitIndex & 1;
  return bitValue === 1;
}
//# sourceMappingURL=parse-3d-implicit-tiles.js.map