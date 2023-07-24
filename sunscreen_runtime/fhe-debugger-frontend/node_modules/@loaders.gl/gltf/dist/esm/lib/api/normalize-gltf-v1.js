import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import * as KHR_binary_glTF from '../extensions/KHR_binary_gltf';
const GLTF_ARRAYS = {
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
const GLTF_KEYS = {
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
class GLTFV1Normalizer {
  constructor() {
    _defineProperty(this, "idToIndexMap", {
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
    _defineProperty(this, "json", void 0);
  }
  normalize(gltf, options) {
    this.json = gltf.json;
    const json = gltf.json;
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
  _addAsset(json) {
    json.asset = json.asset || {};
    json.asset.version = '2.0';
    json.asset.generator = json.asset.generator || 'Normalized to glTF 2.0 by loaders.gl';
  }
  _convertTopLevelObjectsToArrays(json) {
    for (const arrayName in GLTF_ARRAYS) {
      this._convertTopLevelObjectToArray(json, arrayName);
    }
  }
  _convertTopLevelObjectToArray(json, mapName) {
    const objectMap = json[mapName];
    if (!objectMap || Array.isArray(objectMap)) {
      return;
    }
    json[mapName] = [];
    for (const id in objectMap) {
      const object = objectMap[id];
      object.id = object.id || id;
      const index = json[mapName].length;
      json[mapName].push(object);
      this.idToIndexMap[mapName][id] = index;
    }
  }
  _convertObjectIdsToArrayIndices(json) {
    for (const arrayName in GLTF_ARRAYS) {
      this._convertIdsToIndices(json, arrayName);
    }
    if ('scene' in json) {
      json.scene = this._convertIdToIndex(json.scene, 'scene');
    }
    for (const texture of json.textures) {
      this._convertTextureIds(texture);
    }
    for (const mesh of json.meshes) {
      this._convertMeshIds(mesh);
    }
    for (const node of json.nodes) {
      this._convertNodeIds(node);
    }
    for (const node of json.scenes) {
      this._convertSceneIds(node);
    }
  }
  _convertTextureIds(texture) {
    if (texture.source) {
      texture.source = this._convertIdToIndex(texture.source, 'image');
    }
  }
  _convertMeshIds(mesh) {
    for (const primitive of mesh.primitives) {
      const {
        attributes,
        indices,
        material
      } = primitive;
      for (const attributeName in attributes) {
        attributes[attributeName] = this._convertIdToIndex(attributes[attributeName], 'accessor');
      }
      if (indices) {
        primitive.indices = this._convertIdToIndex(indices, 'accessor');
      }
      if (material) {
        primitive.material = this._convertIdToIndex(material, 'material');
      }
    }
  }
  _convertNodeIds(node) {
    if (node.children) {
      node.children = node.children.map(child => this._convertIdToIndex(child, 'node'));
    }
    if (node.meshes) {
      node.meshes = node.meshes.map(mesh => this._convertIdToIndex(mesh, 'mesh'));
    }
  }
  _convertSceneIds(scene) {
    if (scene.nodes) {
      scene.nodes = scene.nodes.map(node => this._convertIdToIndex(node, 'node'));
    }
  }
  _convertIdsToIndices(json, topLevelArrayName) {
    if (!json[topLevelArrayName]) {
      console.warn("gltf v1: json doesn't contain attribute ".concat(topLevelArrayName));
      json[topLevelArrayName] = [];
    }
    for (const object of json[topLevelArrayName]) {
      for (const key in object) {
        const id = object[key];
        const index = this._convertIdToIndex(id, key);
        object[key] = index;
      }
    }
  }
  _convertIdToIndex(id, key) {
    const arrayName = GLTF_KEYS[key];
    if (arrayName in this.idToIndexMap) {
      const index = this.idToIndexMap[arrayName][id];
      if (!Number.isFinite(index)) {
        throw new Error("gltf v1: failed to resolve ".concat(key, " with id ").concat(id));
      }
      return index;
    }
    return id;
  }
  _updateObjects(json) {
    for (const buffer of this.json.buffers) {
      delete buffer.type;
    }
  }
  _updateMaterial(json) {
    for (const material of json.materials) {
      var _material$values, _material$values2, _material$values3;
      material.pbrMetallicRoughness = {
        baseColorFactor: [1, 1, 1, 1],
        metallicFactor: 1,
        roughnessFactor: 1
      };
      const textureId = ((_material$values = material.values) === null || _material$values === void 0 ? void 0 : _material$values.tex) || ((_material$values2 = material.values) === null || _material$values2 === void 0 ? void 0 : _material$values2.texture2d_0) || ((_material$values3 = material.values) === null || _material$values3 === void 0 ? void 0 : _material$values3.diffuseTex);
      const textureIndex = json.textures.findIndex(texture => texture.id === textureId);
      if (textureIndex !== -1) {
        material.pbrMetallicRoughness.baseColorTexture = {
          index: textureIndex
        };
      }
    }
  }
}
export function normalizeGLTFV1(gltf) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return new GLTFV1Normalizer().normalize(gltf, options);
}
//# sourceMappingURL=normalize-gltf-v1.js.map