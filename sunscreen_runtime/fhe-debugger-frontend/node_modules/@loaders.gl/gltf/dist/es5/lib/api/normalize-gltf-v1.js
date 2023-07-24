"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalizeGLTFV1 = normalizeGLTFV1;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var KHR_binary_glTF = _interopRequireWildcard(require("../extensions/KHR_binary_gltf"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var GLTF_ARRAYS = {
  accessors: 'accessor',
  animations: 'animation',
  buffers: 'buffer',
  bufferViews: 'bufferView',
  images: 'image',
  materials: 'material',
  meshes: 'mesh',
  nodes: 'node',
  samplers: 'sampler',
  scenes: 'scene',
  skins: 'skin',
  textures: 'texture'
};
var GLTF_KEYS = {
  accessor: 'accessors',
  animations: 'animation',
  buffer: 'buffers',
  bufferView: 'bufferViews',
  image: 'images',
  material: 'materials',
  mesh: 'meshes',
  node: 'nodes',
  sampler: 'samplers',
  scene: 'scenes',
  skin: 'skins',
  texture: 'textures'
};
var GLTFV1Normalizer = function () {
  function GLTFV1Normalizer() {
    (0, _classCallCheck2.default)(this, GLTFV1Normalizer);
    (0, _defineProperty2.default)(this, "idToIndexMap", {
      animations: {},
      accessors: {},
      buffers: {},
      bufferViews: {},
      images: {},
      materials: {},
      meshes: {},
      nodes: {},
      samplers: {},
      scenes: {},
      skins: {},
      textures: {}
    });
    (0, _defineProperty2.default)(this, "json", void 0);
  }
  (0, _createClass2.default)(GLTFV1Normalizer, [{
    key: "normalize",
    value: function normalize(gltf, options) {
      this.json = gltf.json;
      var json = gltf.json;
      switch (json.asset && json.asset.version) {
        case '2.0':
          return;
        case undefined:
        case '1.0':
          break;
        default:
          console.warn("glTF: Unknown version ".concat(json.asset.version));
          return;
      }
      if (!options.normalize) {
        throw new Error('glTF v1 is not supported.');
      }
      console.warn('Converting glTF v1 to glTF v2 format. This is experimental and may fail.');
      this._addAsset(json);
      this._convertTopLevelObjectsToArrays(json);
      KHR_binary_glTF.preprocess(gltf);
      this._convertObjectIdsToArrayIndices(json);
      this._updateObjects(json);
      this._updateMaterial(json);
    }
  }, {
    key: "_addAsset",
    value: function _addAsset(json) {
      json.asset = json.asset || {};
      json.asset.version = '2.0';
      json.asset.generator = json.asset.generator || 'Normalized to glTF 2.0 by loaders.gl';
    }
  }, {
    key: "_convertTopLevelObjectsToArrays",
    value: function _convertTopLevelObjectsToArrays(json) {
      for (var arrayName in GLTF_ARRAYS) {
        this._convertTopLevelObjectToArray(json, arrayName);
      }
    }
  }, {
    key: "_convertTopLevelObjectToArray",
    value: function _convertTopLevelObjectToArray(json, mapName) {
      var objectMap = json[mapName];
      if (!objectMap || Array.isArray(objectMap)) {
        return;
      }
      json[mapName] = [];
      for (var id in objectMap) {
        var object = objectMap[id];
        object.id = object.id || id;
        var index = json[mapName].length;
        json[mapName].push(object);
        this.idToIndexMap[mapName][id] = index;
      }
    }
  }, {
    key: "_convertObjectIdsToArrayIndices",
    value: function _convertObjectIdsToArrayIndices(json) {
      for (var arrayName in GLTF_ARRAYS) {
        this._convertIdsToIndices(json, arrayName);
      }
      if ('scene' in json) {
        json.scene = this._convertIdToIndex(json.scene, 'scene');
      }
      var _iterator = _createForOfIteratorHelper(json.textures),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var texture = _step.value;
          this._convertTextureIds(texture);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      var _iterator2 = _createForOfIteratorHelper(json.meshes),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var mesh = _step2.value;
          this._convertMeshIds(mesh);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      var _iterator3 = _createForOfIteratorHelper(json.nodes),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var node = _step3.value;
          this._convertNodeIds(node);
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
      var _iterator4 = _createForOfIteratorHelper(json.scenes),
        _step4;
      try {
        for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
          var _node = _step4.value;
          this._convertSceneIds(_node);
        }
      } catch (err) {
        _iterator4.e(err);
      } finally {
        _iterator4.f();
      }
    }
  }, {
    key: "_convertTextureIds",
    value: function _convertTextureIds(texture) {
      if (texture.source) {
        texture.source = this._convertIdToIndex(texture.source, 'image');
      }
    }
  }, {
    key: "_convertMeshIds",
    value: function _convertMeshIds(mesh) {
      var _iterator5 = _createForOfIteratorHelper(mesh.primitives),
        _step5;
      try {
        for (_iterator5.s(); !(_step5 = _iterator5.n()).done;) {
          var primitive = _step5.value;
          var attributes = primitive.attributes,
            indices = primitive.indices,
            material = primitive.material;
          for (var attributeName in attributes) {
            attributes[attributeName] = this._convertIdToIndex(attributes[attributeName], 'accessor');
          }
          if (indices) {
            primitive.indices = this._convertIdToIndex(indices, 'accessor');
          }
          if (material) {
            primitive.material = this._convertIdToIndex(material, 'material');
          }
        }
      } catch (err) {
        _iterator5.e(err);
      } finally {
        _iterator5.f();
      }
    }
  }, {
    key: "_convertNodeIds",
    value: function _convertNodeIds(node) {
      var _this = this;
      if (node.children) {
        node.children = node.children.map(function (child) {
          return _this._convertIdToIndex(child, 'node');
        });
      }
      if (node.meshes) {
        node.meshes = node.meshes.map(function (mesh) {
          return _this._convertIdToIndex(mesh, 'mesh');
        });
      }
    }
  }, {
    key: "_convertSceneIds",
    value: function _convertSceneIds(scene) {
      var _this2 = this;
      if (scene.nodes) {
        scene.nodes = scene.nodes.map(function (node) {
          return _this2._convertIdToIndex(node, 'node');
        });
      }
    }
  }, {
    key: "_convertIdsToIndices",
    value: function _convertIdsToIndices(json, topLevelArrayName) {
      if (!json[topLevelArrayName]) {
        console.warn("gltf v1: json doesn't contain attribute ".concat(topLevelArrayName));
        json[topLevelArrayName] = [];
      }
      var _iterator6 = _createForOfIteratorHelper(json[topLevelArrayName]),
        _step6;
      try {
        for (_iterator6.s(); !(_step6 = _iterator6.n()).done;) {
          var object = _step6.value;
          for (var key in object) {
            var id = object[key];
            var index = this._convertIdToIndex(id, key);
            object[key] = index;
          }
        }
      } catch (err) {
        _iterator6.e(err);
      } finally {
        _iterator6.f();
      }
    }
  }, {
    key: "_convertIdToIndex",
    value: function _convertIdToIndex(id, key) {
      var arrayName = GLTF_KEYS[key];
      if (arrayName in this.idToIndexMap) {
        var index = this.idToIndexMap[arrayName][id];
        if (!Number.isFinite(index)) {
          throw new Error("gltf v1: failed to resolve ".concat(key, " with id ").concat(id));
        }
        return index;
      }
      return id;
    }
  }, {
    key: "_updateObjects",
    value: function _updateObjects(json) {
      var _iterator7 = _createForOfIteratorHelper(this.json.buffers),
        _step7;
      try {
        for (_iterator7.s(); !(_step7 = _iterator7.n()).done;) {
          var buffer = _step7.value;
          delete buffer.type;
        }
      } catch (err) {
        _iterator7.e(err);
      } finally {
        _iterator7.f();
      }
    }
  }, {
    key: "_updateMaterial",
    value: function _updateMaterial(json) {
      var _iterator8 = _createForOfIteratorHelper(json.materials),
        _step8;
      try {
        var _loop = function _loop() {
          var _material$values, _material$values2, _material$values3;
          var material = _step8.value;
          material.pbrMetallicRoughness = {
            baseColorFactor: [1, 1, 1, 1],
            metallicFactor: 1,
            roughnessFactor: 1
          };
          var textureId = ((_material$values = material.values) === null || _material$values === void 0 ? void 0 : _material$values.tex) || ((_material$values2 = material.values) === null || _material$values2 === void 0 ? void 0 : _material$values2.texture2d_0) || ((_material$values3 = material.values) === null || _material$values3 === void 0 ? void 0 : _material$values3.diffuseTex);
          var textureIndex = json.textures.findIndex(function (texture) {
            return texture.id === textureId;
          });
          if (textureIndex !== -1) {
            material.pbrMetallicRoughness.baseColorTexture = {
              index: textureIndex
            };
          }
        };
        for (_iterator8.s(); !(_step8 = _iterator8.n()).done;) {
          _loop();
        }
      } catch (err) {
        _iterator8.e(err);
      } finally {
        _iterator8.f();
      }
    }
  }]);
  return GLTFV1Normalizer;
}();
function normalizeGLTFV1(gltf) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return new GLTFV1Normalizer().normalize(gltf, options);
}
//# sourceMappingURL=normalize-gltf-v1.js.map