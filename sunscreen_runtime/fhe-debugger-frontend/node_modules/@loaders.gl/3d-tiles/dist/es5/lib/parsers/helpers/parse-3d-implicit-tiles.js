"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseImplicitTiles = parseImplicitTiles;
exports.replaceContentUrlTemplate = replaceContentUrlTemplate;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _tile3dSubtreeLoader = require("../../../tile-3d-subtree-loader");
var _core = require("@loaders.gl/core");
var _index = require("../../utils/s2/index");
var _s2CornersToObb = require("../../utils/obb/s2-corners-to-obb");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var QUADTREE_DEVISION_COUNT = 4;
var OCTREE_DEVISION_COUNT = 8;
var SUBDIVISION_COUNT_MAP = {
  QUADTREE: QUADTREE_DEVISION_COUNT,
  OCTREE: OCTREE_DEVISION_COUNT
};
function getChildS2VolumeBox(s2VolumeBox, index, subdivisionScheme) {
  if (s2VolumeBox !== null && s2VolumeBox !== void 0 && s2VolumeBox.box) {
    var cellId = (0, _index.getS2CellIdFromToken)(s2VolumeBox.s2VolumeInfo.token);
    var childCellId = (0, _index.getS2ChildCellId)(cellId, index);
    var childToken = (0, _index.getS2TokenFromCellId)(childCellId);
    var s2ChildVolumeInfo = _objectSpread({}, s2VolumeBox.s2VolumeInfo);
    s2ChildVolumeInfo.token = childToken;
    switch (subdivisionScheme) {
      case 'OCTREE':
        var s2VolumeInfo = s2VolumeBox.s2VolumeInfo;
        var delta = s2VolumeInfo.maximumHeight - s2VolumeInfo.minimumHeight;
        var sizeZ = delta / 2.0;
        var midZ = s2VolumeInfo.minimumHeight + delta / 2.0;
        s2VolumeInfo.minimumHeight = midZ - sizeZ;
        s2VolumeInfo.maximumHeight = midZ + sizeZ;
        break;
      default:
        break;
    }
    var box = (0, _s2CornersToObb.convertS2BoundingVolumetoOBB)(s2ChildVolumeInfo);
    var childS2VolumeBox = {
      box: box,
      s2VolumeInfo: s2ChildVolumeInfo
    };
    return childS2VolumeBox;
  }
  return undefined;
}
function parseImplicitTiles(_x) {
  return _parseImplicitTiles.apply(this, arguments);
}
function _parseImplicitTiles() {
  _parseImplicitTiles = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(params) {
    var options, _params$parentData, parentData, _params$childIndex, childIndex, _params$globalData, globalData, s2VolumeBox, subtree, _params$level, level, subdivisionScheme, subtreeLevels, maximumLevel, contentUrlTemplate, subtreesUriTemplate, basePath, tile, childrenPerTile, childX, childY, childZ, levelOffset, childTileMortonIndex, tileAvailabilityIndex, childTileX, childTileY, childTileZ, isChildSubtreeAvailable, x, y, z, lev, subtreePath, childSubtreeUrl, childSubtree, isTileAvailable, isContentAvailable, childTileLevel, pData, index, childS2VolumeBox, childTileParsed, globalLevel, childCoordinates, formattedTile;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = params.options, _params$parentData = params.parentData, parentData = _params$parentData === void 0 ? {
            mortonIndex: 0,
            x: 0,
            y: 0,
            z: 0
          } : _params$parentData, _params$childIndex = params.childIndex, childIndex = _params$childIndex === void 0 ? 0 : _params$childIndex, _params$globalData = params.globalData, globalData = _params$globalData === void 0 ? {
            level: 0,
            mortonIndex: 0,
            x: 0,
            y: 0,
            z: 0
          } : _params$globalData, s2VolumeBox = params.s2VolumeBox;
          subtree = params.subtree, _params$level = params.level, level = _params$level === void 0 ? 0 : _params$level;
          subdivisionScheme = options.subdivisionScheme, subtreeLevels = options.subtreeLevels, maximumLevel = options.maximumLevel, contentUrlTemplate = options.contentUrlTemplate, subtreesUriTemplate = options.subtreesUriTemplate, basePath = options.basePath;
          tile = {
            children: [],
            lodMetricValue: 0,
            contentUrl: ''
          };
          childrenPerTile = SUBDIVISION_COUNT_MAP[subdivisionScheme];
          childX = childIndex & 1;
          childY = childIndex >> 1 & 1;
          childZ = childIndex >> 2 & 1;
          levelOffset = (Math.pow(childrenPerTile, level) - 1) / (childrenPerTile - 1);
          childTileMortonIndex = concatBits(parentData.mortonIndex, childIndex);
          tileAvailabilityIndex = levelOffset + childTileMortonIndex;
          childTileX = concatBits(parentData.x, childX);
          childTileY = concatBits(parentData.y, childY);
          childTileZ = concatBits(parentData.z, childZ);
          isChildSubtreeAvailable = false;
          if (level + 1 > subtreeLevels) {
            isChildSubtreeAvailable = getAvailabilityResult(subtree.childSubtreeAvailability, childTileMortonIndex);
          }
          x = concatBits(globalData.x, childTileX);
          y = concatBits(globalData.y, childTileY);
          z = concatBits(globalData.z, childTileZ);
          lev = level + globalData.level;
          if (!isChildSubtreeAvailable) {
            _context.next = 38;
            break;
          }
          subtreePath = "".concat(basePath, "/").concat(subtreesUriTemplate);
          childSubtreeUrl = replaceContentUrlTemplate(subtreePath, lev, x, y, z);
          _context.next = 25;
          return (0, _core.load)(childSubtreeUrl, _tile3dSubtreeLoader.Tile3DSubtreeLoader);
        case 25:
          childSubtree = _context.sent;
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
        case 38:
          isTileAvailable = getAvailabilityResult(subtree.tileAvailability, tileAvailabilityIndex);
          if (!(!isTileAvailable || level > maximumLevel)) {
            _context.next = 41;
            break;
          }
          return _context.abrupt("return", tile);
        case 41:
          isContentAvailable = getAvailabilityResult(subtree.contentAvailability, tileAvailabilityIndex);
          if (isContentAvailable) {
            tile.contentUrl = replaceContentUrlTemplate(contentUrlTemplate, lev, x, y, z);
          }
          childTileLevel = level + 1;
          pData = {
            mortonIndex: childTileMortonIndex,
            x: childTileX,
            y: childTileY,
            z: childTileZ
          };
          index = 0;
        case 46:
          if (!(index < childrenPerTile)) {
            _context.next = 55;
            break;
          }
          childS2VolumeBox = getChildS2VolumeBox(s2VolumeBox, index, subdivisionScheme);
          _context.next = 50;
          return parseImplicitTiles({
            subtree: subtree,
            options: options,
            parentData: pData,
            childIndex: index,
            level: childTileLevel,
            globalData: globalData,
            s2VolumeBox: childS2VolumeBox
          });
        case 50:
          childTileParsed = _context.sent;
          if (childTileParsed.contentUrl || childTileParsed.children.length) {
            globalLevel = lev + 1;
            childCoordinates = {
              childTileX: childTileX,
              childTileY: childTileY,
              childTileZ: childTileZ
            };
            formattedTile = formatTileData(childTileParsed, globalLevel, childCoordinates, options, s2VolumeBox);
            tile.children.push(formattedTile);
          }
        case 52:
          index++;
          _context.next = 46;
          break;
        case 55:
          return _context.abrupt("return", tile);
        case 56:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseImplicitTiles.apply(this, arguments);
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
  var basePath = options.basePath,
    refine = options.refine,
    getRefine = options.getRefine,
    lodMetricType = options.lodMetricType,
    getTileType = options.getTileType,
    rootLodMetricValue = options.rootLodMetricValue,
    rootBoundingVolume = options.rootBoundingVolume;
  var uri = tile.contentUrl && tile.contentUrl.replace("".concat(basePath, "/"), '');
  var lodMetricValue = rootLodMetricValue / Math.pow(2, level);
  var boundingVolume = s2VolumeBox !== null && s2VolumeBox !== void 0 && s2VolumeBox.box ? {
    box: s2VolumeBox.box
  } : rootBoundingVolume;
  var boundingVolumeForChildTile = calculateBoundingVolumeForChildTile(level, boundingVolume, childCoordinates);
  return {
    children: tile.children,
    contentUrl: tile.contentUrl,
    content: {
      uri: uri
    },
    id: tile.contentUrl,
    refine: getRefine(refine),
    type: getTileType(tile),
    lodMetricType: lodMetricType,
    lodMetricValue: lodMetricValue,
    geometricError: lodMetricValue,
    transform: tile.transform,
    boundingVolume: boundingVolumeForChildTile
  };
}
function calculateBoundingVolumeForChildTile(level, rootBoundingVolume, childCoordinates) {
  if (rootBoundingVolume.region) {
    var childTileX = childCoordinates.childTileX,
      childTileY = childCoordinates.childTileY,
      childTileZ = childCoordinates.childTileZ;
    var _rootBoundingVolume$r = (0, _slicedToArray2.default)(rootBoundingVolume.region, 6),
      west = _rootBoundingVolume$r[0],
      south = _rootBoundingVolume$r[1],
      east = _rootBoundingVolume$r[2],
      north = _rootBoundingVolume$r[3],
      minimumHeight = _rootBoundingVolume$r[4],
      maximumHeight = _rootBoundingVolume$r[5];
    var boundingVolumesCount = Math.pow(2, level);
    var sizeX = (east - west) / boundingVolumesCount;
    var sizeY = (north - south) / boundingVolumesCount;
    var sizeZ = (maximumHeight - minimumHeight) / boundingVolumesCount;
    var childWest = west + sizeX * childTileX,
      childEast = west + sizeX * (childTileX + 1);
    var childSouth = south + sizeY * childTileY,
      childNorth = south + sizeY * (childTileY + 1);
    var childMinimumHeight = minimumHeight + sizeZ * childTileZ,
      childMaximumHeight = minimumHeight + sizeZ * (childTileZ + 1);
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
function replaceContentUrlTemplate(templateUrl, level, x, y, z) {
  var mapUrl = generateMapUrl({
    level: level,
    x: x,
    y: y,
    z: z
  });
  return templateUrl.replace(/{level}|{x}|{y}|{z}/gi, function (matched) {
    return mapUrl[matched];
  });
}
function generateMapUrl(items) {
  var mapUrl = {};
  for (var _key in items) {
    mapUrl["{".concat(_key, "}")] = items[_key];
  }
  return mapUrl;
}
function getBooleanValueFromBitstream(availabilityIndex, availabilityBuffer) {
  var byteIndex = Math.floor(availabilityIndex / 8);
  var bitIndex = availabilityIndex % 8;
  var bitValue = availabilityBuffer[byteIndex] >> bitIndex & 1;
  return bitValue === 1;
}
//# sourceMappingURL=parse-3d-implicit-tiles.js.map