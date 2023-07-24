import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { GL, GLType } from '@loaders.gl/math';
export default class Tile3DFeatureTable {
  constructor(featureTableJson, featureTableBinary) {
    _defineProperty(this, "json", void 0);
    _defineProperty(this, "buffer", void 0);
    _defineProperty(this, "featuresLength", 0);
    _defineProperty(this, "_cachedTypedArrays", {});
    this.json = featureTableJson;
    this.buffer = featureTableBinary;
  }
  getExtension(extensionName) {
    return this.json.extensions && this.json.extensions[extensionName];
  }
  hasProperty(propertyName) {
    return Boolean(this.json[propertyName]);
  }
  getGlobalProperty(propertyName) {
    let componentType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : GL.UNSIGNED_INT;
    let componentLength = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    const jsonValue = this.json[propertyName];
    if (jsonValue && Number.isFinite(jsonValue.byteOffset)) {
      return this._getTypedArrayFromBinary(propertyName, componentType, componentLength, 1, jsonValue.byteOffset);
    }
    return jsonValue;
  }
  getPropertyArray(propertyName, componentType, componentLength) {
    const jsonValue = this.json[propertyName];
    if (jsonValue && Number.isFinite(jsonValue.byteOffset)) {
      if ('componentType' in jsonValue) {
        componentType = GLType.fromName(jsonValue.componentType);
      }
      return this._getTypedArrayFromBinary(propertyName, componentType, componentLength, this.featuresLength, jsonValue.byteOffset);
    }
    return this._getTypedArrayFromArray(propertyName, componentType, jsonValue);
  }
  getProperty(propertyName, componentType, componentLength, featureId, result) {
    const jsonValue = this.json[propertyName];
    if (!jsonValue) {
      return jsonValue;
    }
    const typedArray = this.getPropertyArray(propertyName, componentType, componentLength);
    if (componentLength === 1) {
      return typedArray[featureId];
    }
    for (let i = 0; i < componentLength; ++i) {
      result[i] = typedArray[componentLength * featureId + i];
    }
    return result;
  }
  _getTypedArrayFromBinary(propertyName, componentType, componentLength, count, byteOffset) {
    const cachedTypedArrays = this._cachedTypedArrays;
    let typedArray = cachedTypedArrays[propertyName];
    if (!typedArray) {
      typedArray = GLType.createTypedArray(componentType, this.buffer.buffer, this.buffer.byteOffset + byteOffset, count * componentLength);
      cachedTypedArrays[propertyName] = typedArray;
    }
    return typedArray;
  }
  _getTypedArrayFromArray(propertyName, componentType, array) {
    const cachedTypedArrays = this._cachedTypedArrays;
    let typedArray = cachedTypedArrays[propertyName];
    if (!typedArray) {
      typedArray = GLType.createTypedArray(componentType, array);
      cachedTypedArrays[propertyName] = typedArray;
    }
    return typedArray;
  }
}
//# sourceMappingURL=tile-3d-feature-table.js.map