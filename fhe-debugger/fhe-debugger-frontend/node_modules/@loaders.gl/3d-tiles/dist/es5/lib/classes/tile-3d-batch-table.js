"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _tile3dAccessorUtils = require("./helpers/tile-3d-accessor-utils");
var _tile3dBatchTableHierarchy = require("./tile-3d-batch-table-hierarchy");
function defined(x) {
  return x !== undefined && x !== null;
}
var clone = function clone(x, y) {
  return x;
};
var IGNORED_PROPERTY_FIELDS = {
  HIERARCHY: true,
  extensions: true,
  extras: true
};
var Tile3DBatchTableParser = function () {
  function Tile3DBatchTableParser(json, binary, featureCount) {
    var _this$json;
    var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    (0, _classCallCheck2.default)(this, Tile3DBatchTableParser);
    (0, _defineProperty2.default)(this, "json", void 0);
    (0, _defineProperty2.default)(this, "binary", void 0);
    (0, _defineProperty2.default)(this, "featureCount", void 0);
    (0, _defineProperty2.default)(this, "_extensions", void 0);
    (0, _defineProperty2.default)(this, "_properties", void 0);
    (0, _defineProperty2.default)(this, "_binaryProperties", void 0);
    (0, _defineProperty2.default)(this, "_hierarchy", void 0);
    (0, _loaderUtils.assert)(featureCount >= 0);
    this.json = json || {};
    this.binary = binary;
    this.featureCount = featureCount;
    this._extensions = ((_this$json = this.json) === null || _this$json === void 0 ? void 0 : _this$json.extensions) || {};
    this._properties = {};
    for (var propertyName in this.json) {
      if (!IGNORED_PROPERTY_FIELDS[propertyName]) {
        this._properties[propertyName] = this.json[propertyName];
      }
    }
    this._binaryProperties = this._initializeBinaryProperties();
    if (options['3DTILES_batch_table_hierarchy']) {
      this._hierarchy = (0, _tile3dBatchTableHierarchy.initializeHierarchy)(this, this.json, this.binary);
    }
  }
  (0, _createClass2.default)(Tile3DBatchTableParser, [{
    key: "getExtension",
    value: function getExtension(extensionName) {
      return this.json && this.json.extensions && this.json.extensions[extensionName];
    }
  }, {
    key: "memorySizeInBytes",
    value: function memorySizeInBytes() {
      return 0;
    }
  }, {
    key: "isClass",
    value: function isClass(batchId, className) {
      this._checkBatchId(batchId);
      (0, _loaderUtils.assert)(typeof className === 'string', className);
      if (this._hierarchy) {
        var result = (0, _tile3dBatchTableHierarchy.traverseHierarchy)(this._hierarchy, batchId, function (hierarchy, instanceIndex) {
          var classId = hierarchy.classIds[instanceIndex];
          var instanceClass = hierarchy.classes[classId];
          return instanceClass.name === className;
        });
        return defined(result);
      }
      return false;
    }
  }, {
    key: "isExactClass",
    value: function isExactClass(batchId, className) {
      (0, _loaderUtils.assert)(typeof className === 'string', className);
      return this.getExactClassName(batchId) === className;
    }
  }, {
    key: "getExactClassName",
    value: function getExactClassName(batchId) {
      this._checkBatchId(batchId);
      if (this._hierarchy) {
        var classId = this._hierarchy.classIds[batchId];
        var instanceClass = this._hierarchy.classes[classId];
        return instanceClass.name;
      }
      return undefined;
    }
  }, {
    key: "hasProperty",
    value: function hasProperty(batchId, name) {
      this._checkBatchId(batchId);
      (0, _loaderUtils.assert)(typeof name === 'string', name);
      return defined(this._properties[name]) || this._hasPropertyInHierarchy(batchId, name);
    }
  }, {
    key: "getPropertyNames",
    value: function getPropertyNames(batchId, results) {
      var _results;
      this._checkBatchId(batchId);
      results = defined(results) ? results : [];
      results.length = 0;
      var propertyNames = Object.keys(this._properties);
      (_results = results).push.apply(_results, propertyNames);
      if (this._hierarchy) {
        this._getPropertyNamesInHierarchy(batchId, results);
      }
      return results;
    }
  }, {
    key: "getProperty",
    value: function getProperty(batchId, name) {
      this._checkBatchId(batchId);
      (0, _loaderUtils.assert)(typeof name === 'string', name);
      if (this._binaryProperties) {
        var binaryProperty = this._binaryProperties[name];
        if (defined(binaryProperty)) {
          return this._getBinaryProperty(binaryProperty, batchId);
        }
      }
      var propertyValues = this._properties[name];
      if (defined(propertyValues)) {
        return clone(propertyValues[batchId], true);
      }
      if (this._hierarchy) {
        var hierarchyProperty = this._getHierarchyProperty(batchId, name);
        if (defined(hierarchyProperty)) {
          return hierarchyProperty;
        }
      }
      return undefined;
    }
  }, {
    key: "setProperty",
    value: function setProperty(batchId, name, value) {
      var featureCount = this.featureCount;
      this._checkBatchId(batchId);
      (0, _loaderUtils.assert)(typeof name === 'string', name);
      if (this._binaryProperties) {
        var binaryProperty = this._binaryProperties[name];
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
      var propertyValues = this._properties[name];
      if (!defined(propertyValues)) {
        this._properties[name] = new Array(featureCount);
        propertyValues = this._properties[name];
      }
      propertyValues[batchId] = clone(value, true);
    }
  }, {
    key: "_checkBatchId",
    value: function _checkBatchId(batchId) {
      var valid = batchId >= 0 && batchId < this.featureCount;
      if (!valid) {
        throw new Error('batchId not in range [0, featureCount - 1].');
      }
    }
  }, {
    key: "_getBinaryProperty",
    value: function _getBinaryProperty(binaryProperty, index) {
      return binaryProperty.unpack(binaryProperty.typedArray, index);
    }
  }, {
    key: "_setBinaryProperty",
    value: function _setBinaryProperty(binaryProperty, index, value) {
      binaryProperty.pack(value, binaryProperty.typedArray, index);
    }
  }, {
    key: "_initializeBinaryProperties",
    value: function _initializeBinaryProperties() {
      var binaryProperties = null;
      for (var name in this._properties) {
        var property = this._properties[name];
        var binaryProperty = this._initializeBinaryProperty(name, property);
        if (binaryProperty) {
          binaryProperties = binaryProperties || {};
          binaryProperties[name] = binaryProperty;
        }
      }
      return binaryProperties;
    }
  }, {
    key: "_initializeBinaryProperty",
    value: function _initializeBinaryProperty(name, property) {
      if ('byteOffset' in property) {
        var tile3DAccessor = property;
        (0, _loaderUtils.assert)(this.binary, "Property ".concat(name, " requires a batch table binary."));
        (0, _loaderUtils.assert)(tile3DAccessor.type, "Property ".concat(name, " requires a type."));
        var accessor = (0, _tile3dAccessorUtils.createTypedArrayFromAccessor)(tile3DAccessor, this.binary.buffer, this.binary.byteOffset | 0, this.featureCount);
        return {
          typedArray: accessor.values,
          componentCount: accessor.size,
          unpack: accessor.unpacker,
          pack: accessor.packer
        };
      }
      return null;
    }
  }, {
    key: "_hasPropertyInHierarchy",
    value: function _hasPropertyInHierarchy(batchId, name) {
      if (!this._hierarchy) {
        return false;
      }
      var result = (0, _tile3dBatchTableHierarchy.traverseHierarchy)(this._hierarchy, batchId, function (hierarchy, instanceIndex) {
        var classId = hierarchy.classIds[instanceIndex];
        var instances = hierarchy.classes[classId].instances;
        return defined(instances[name]);
      });
      return defined(result);
    }
  }, {
    key: "_getPropertyNamesInHierarchy",
    value: function _getPropertyNamesInHierarchy(batchId, results) {
      (0, _tile3dBatchTableHierarchy.traverseHierarchy)(this._hierarchy, batchId, function (hierarchy, instanceIndex) {
        var classId = hierarchy.classIds[instanceIndex];
        var instances = hierarchy.classes[classId].instances;
        for (var name in instances) {
          if (instances.hasOwnProperty(name)) {
            if (results.indexOf(name) === -1) {
              results.push(name);
            }
          }
        }
      });
    }
  }, {
    key: "_getHierarchyProperty",
    value: function _getHierarchyProperty(batchId, name) {
      var _this = this;
      return (0, _tile3dBatchTableHierarchy.traverseHierarchy)(this._hierarchy, batchId, function (hierarchy, instanceIndex) {
        var classId = hierarchy.classIds[instanceIndex];
        var instanceClass = hierarchy.classes[classId];
        var indexInClass = hierarchy.classIndexes[instanceIndex];
        var propertyValues = instanceClass.instances[name];
        if (defined(propertyValues)) {
          if (defined(propertyValues.typedArray)) {
            return _this._getBinaryProperty(propertyValues, indexInClass);
          }
          return clone(propertyValues[indexInClass], true);
        }
        return null;
      });
    }
  }, {
    key: "_setHierarchyProperty",
    value: function _setHierarchyProperty(batchTable, batchId, name, value) {
      var _this2 = this;
      var result = (0, _tile3dBatchTableHierarchy.traverseHierarchy)(this._hierarchy, batchId, function (hierarchy, instanceIndex) {
        var classId = hierarchy.classIds[instanceIndex];
        var instanceClass = hierarchy.classes[classId];
        var indexInClass = hierarchy.classIndexes[instanceIndex];
        var propertyValues = instanceClass.instances[name];
        if (defined(propertyValues)) {
          (0, _loaderUtils.assert)(instanceIndex === batchId, "Inherited property \"".concat(name, "\" is read-only."));
          if (defined(propertyValues.typedArray)) {
            _this2._setBinaryProperty(propertyValues, indexInClass, value);
          } else {
            propertyValues[indexInClass] = clone(value, true);
          }
          return true;
        }
        return false;
      });
      return defined(result);
    }
  }]);
  return Tile3DBatchTableParser;
}();
exports.default = Tile3DBatchTableParser;
//# sourceMappingURL=tile-3d-batch-table.js.map