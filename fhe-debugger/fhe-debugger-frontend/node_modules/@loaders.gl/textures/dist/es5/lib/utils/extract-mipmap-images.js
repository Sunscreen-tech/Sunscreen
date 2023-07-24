"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.extractMipmapImages = extractMipmapImages;
function extractMipmapImages(data, options) {
  var images = new Array(options.mipMapLevels);
  var levelWidth = options.width;
  var levelHeight = options.height;
  var offset = 0;
  for (var i = 0; i < options.mipMapLevels; ++i) {
    var levelSize = getLevelSize(options, levelWidth, levelHeight, data, i);
    var levelData = getLevelData(data, i, offset, levelSize);
    images[i] = {
      compressed: true,
      format: options.internalFormat,
      data: levelData,
      width: levelWidth,
      height: levelHeight,
      levelSize: levelSize
    };
    levelWidth = Math.max(1, levelWidth >> 1);
    levelHeight = Math.max(1, levelHeight >> 1);
    offset += levelSize;
  }
  return images;
}
function getLevelData(data, index, offset, levelSize) {
  if (!Array.isArray(data)) {
    return new Uint8Array(data.buffer, data.byteOffset + offset, levelSize);
  }
  return data[index].levelData;
}
function getLevelSize(options, levelWidth, levelHeight, data, index) {
  if (!Array.isArray(data)) {
    return options.sizeFunction(levelWidth, levelHeight);
  }
  return options.sizeFunction(data[index]);
}
//# sourceMappingURL=extract-mipmap-images.js.map