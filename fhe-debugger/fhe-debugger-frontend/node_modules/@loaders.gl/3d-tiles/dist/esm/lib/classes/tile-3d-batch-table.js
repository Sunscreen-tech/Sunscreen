import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { assert } from '@loaders.gl/loader-utils';
import { createTypedArrayFromAccessor } from './helpers/tile-3d-accessor-utils';
import { initializeHierarchy, traverseHierarchy } from './tile-3d-batch-table-hierarchy';
function defined(x) {
  return x !== undefined && x !== null;
}
const clone = (x, y) => x;
const IGNORED_PROPERTY_FIELDS = {
  HIERARCHY: true,
  extensions: true,
  extras: true
};
export default class Tile3DBatchTableParser {
  constructor(json, binary, featureCount) {
    var _this$json;
    let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    _defineProperty(this, "json", void 0);
    _defineProperty(this, "binary", void 0);
    _defineProperty(this, "featureCount", void 0);
    _defineProperty(this, "_extensions", void 0);
    _defineProperty(this, "_properties", void 0);
    _defineProperty(this, "_binaryProperties", void 0);
    _defineProperty(this, "_hierarchy", void 0);
    assert(featureCount >= 0);
    this.json = json || {};
    this.binary = binary;
    this.featureCount = featureCount;
    this._extensions = ((_this$json = this.json) === null || _this$json === void 0 ? void 0 : _this$json.extensions) || {};
    this._properties = {};
    for (const propertyName in this.json) {
      if (!IGNORED_PROPERTY_FIELDS[propertyName]) {
        this._properties[propertyName] = this.json[propertyName];
      }
    }
    this._binaryProperties = this._initializeBinaryProperties();
    if (options['3DTILES_batch_table_hierarchy']) {
      this._hierarchy = initializeHierarchy(this, this.json, this.binary);
    }
  }
  getExtension(extensionName) {
    return this.json && this.json.extensions && this.json.extensions[extensionName];
  }
  memorySizeInBytes() {
    return 0;
  }
  isClass(batchId, className) {
    this._checkBatchId(batchId);
    assert(typeof className === 'string', className);
    if (this._hierarchy) {
      const result = traverseHierarchy(this._hierarchy, batchId, (hierarchy, instanceIndex) => {
        const classId = hierarchy.classIds[instanceIndex];
        const instanceClass = hierarchy.classes[classId];
        return instanceClass.name === className;
      });
      return defined(result);
    }
    return false;
  }
  isExactClass(batchId, className) {
    assert(typeof className === 'string', className);
    return this.getExactClassName(batchId) === className;
  }
  getExactClassName(batchId) {
    this._checkBatchId(batchId);
    if (this._hierarchy) {
      const classId = this._hierarchy.classIds[batchId];
      const instanceClass = this._hierarchy.classes[classId];
      return instanceClass.name;
    }
    return undefined;
  }
  hasProperty(batchId, name) {
    this._checkBatchId(batchId);
    assert(typeof name === 'string', name);
    return defined(this._properties[name]) || this._hasPropertyInHierarchy(batchId, name);
  }
  getPropertyNames(batchId, results) {
    this._checkBatchId(batchId);
    results = defined(results) ? results : [];
    results.length = 0;
    const propertyNames = Object.keys(this._properties);
    results.push(...propertyNames);
    if (this._hierarchy) {
      this._getPropertyNamesInHierarchy(batchId, results);
    }
    return results;
  }
  getProperty(batchId, name) {
    this._checkBatchId(batchId);
    assert(typeof name === 'string', name);
    if (this._binaryProperties) {
      const binaryProperty = this._binaryProperties[name];
      if (defined(binaryProperty)) {
        return this._getBinaryProperty(binaryProperty, batchId);
      }
    }
    const propertyValues = this._properties[name];
    if (defined(propertyValues)) {
      return clone(propertyValues[batchId], true);
    }
    if (this._hierarchy) {
      const hierarchyProperty = this._getHierarchyProperty(batchId, name);
      if (defined(hierarchyProperty)) {
        return hierarchyProperty;
      }
    }
    return undefined;
  }
  setProperty(batchId, name, value) {
    const featureCount = this.featureCount;
    this._checkBatchId(batchId);
    assert(typeof name === 'string', name);
    if (this._binaryProperties) {
      const binaryProperty = this._binaryProperties[name];
      if (binaryProperty) {
        this._setBinaryProperty(binaryProperty, batchId, value);
        return;
      }
    }
    if (this._hierarchy) {
      if (this._setHierarchyProperty(this, batchId, name, value)) {
        return;
      }
    }
    let propertyValues = this._properties[name];
    if (!defined(propertyValues)) {
      this._properties[name] = new Array(featureCount);
      propertyValues = this._properties[name];
    }
    propertyValues[batchId] = clone(value, true);
  }
  _checkBatchId(batchId) {
    const valid = batchId >= 0 && batchId < this.featureCount;
    if (!valid) {
      throw new Error('batchId not in range [0, featureCount - 1].');
    }
  }
  _getBinaryProperty(binaryProperty, index) {
    return binaryProperty.unpack(binaryProperty.typedArray, index);
  }
  _setBinaryProperty(binaryProperty, index, value) {
    binaryProperty.pack(value, binaryProperty.typedArray, index);
  }
  _initializeBinaryProperties() {
    let binaryProperties = null;
    for (const name in this._properties) {
      const property = this._properties[name];
      const binaryProperty = this._initializeBinaryProperty(name, property);
      if (binaryProperty) {
        binaryProperties = binaryProperties || {};
        binaryProperties[name] = binaryProperty;
      }
    }
    return binaryProperties;
  }
  _initializeBinaryProperty(name, property) {
    if ('byteOffset' in property) {
      const tile3DAccessor = property;
      assert(this.binary, "Property ".concat(name, " requires a batch table binary."));
      assert(tile3DAccessor.type, "Property ".concat(name, " requires a type."));
      const accessor = createTypedArrayFromAccessor(tile3DAccessor, this.binary.buffer, this.binary.byteOffset | 0, this.featureCount);
      return {
        typedArray: accessor.values,
        componentCount: accessor.size,
        unpack: accessor.unpacker,
        pack: accessor.packer
      };
    }
    return null;
  }
  _hasPropertyInHierarchy(batchId, name) {
    if (!this._hierarchy) {
      return false;
    }
    const result = traverseHierarchy(this._hierarchy, batchId, (hierarchy, instanceIndex) => {
      const classId = hierarchy.classIds[instanceIndex];
      const instances = hierarchy.classes[classId].instances;
      return defined(instances[name]);
    });
    return defined(result);
  }
  _getPropertyNamesInHierarchy(batchId, results) {
    traverseHierarchy(this._hierarchy, batchId, (hierarchy, instanceIndex) => {
      const classId = hierarchy.classIds[instanceIndex];
      const instances = hierarchy.classes[classId].instances;
      for (const name in instances) {
        if (instances.hasOwnProperty(name)) {
          if (results.indexOf(name) === -1) {
            results.push(name);
          }
        }
      }
    });
  }
  _getHierarchyProperty(batchId, name) {
    return traverseHierarchy(this._hierarchy, batchId, (hierarchy, instanceIndex) => {
      const classId = hierarchy.classIds[instanceIndex];
      const instanceClass = hierarchy.classes[classId];
      const indexInClass = hierarchy.classIndexes[instanceIndex];
      const propertyValues = instanceClass.instances[name];
      if (defined(propertyValues)) {
        if (defined(propertyValues.typedArray)) {
          return this._getBinaryProperty(propertyValues, indexInClass);
        }
        return clone(propertyValues[indexInClass], true);
      }
      return null;
    });
  }
  _setHierarchyProperty(batchTable, batchId, name, value) {
    const result = traverseHierarchy(this._hierarchy, batchId, (hierarchy, instanceIndex) => {
      const classId = hierarchy.classIds[instanceIndex];
      const instanceClass = hierarchy.classes[classId];
      const indexInClass = hierarchy.classIndexes[instanceIndex];
      const propertyValues = instanceClass.instances[name];
      if (defined(propertyValues)) {
        assert(instanceIndex === batchId, "Inherited property \"".concat(name, "\" is read-only."));
        if (defined(propertyValues.typedArray)) {
          this._setBinaryProperty(propertyValues, indexInClass, value);
        } else {
          propertyValues[indexInClass] = clone(value, true);
        }
        return true;
      }
      return false;
    });
    return defined(result);
  }
}
//# sourceMappingURL=tile-3d-batch-table.js.map