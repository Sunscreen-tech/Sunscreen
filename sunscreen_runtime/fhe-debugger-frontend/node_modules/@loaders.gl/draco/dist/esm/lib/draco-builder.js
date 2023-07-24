import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
const GLTF_TO_DRACO_ATTRIBUTE_NAME_MAP = {
  POSITION: 'POSITION',
  NORMAL: 'NORMAL',
  COLOR_0: 'COLOR',
  TEXCOORD_0: 'TEX_COORD'
};
const noop = () => {};
export default class DracoBuilder {
  constructor(draco) {
    _defineProperty(this, "draco", void 0);
    _defineProperty(this, "dracoEncoder", void 0);
    _defineProperty(this, "dracoMeshBuilder", void 0);
    _defineProperty(this, "dracoMetadataBuilder", void 0);
    _defineProperty(this, "log", void 0);
    this.draco = draco;
    this.dracoEncoder = new this.draco.Encoder();
    this.dracoMeshBuilder = new this.draco.MeshBuilder();
    this.dracoMetadataBuilder = new this.draco.MetadataBuilder();
  }
  destroy() {
    this.destroyEncodedObject(this.dracoMeshBuilder);
    this.destroyEncodedObject(this.dracoEncoder);
    this.destroyEncodedObject(this.dracoMetadataBuilder);
    this.dracoMeshBuilder = null;
    this.dracoEncoder = null;
    this.draco = null;
  }
  destroyEncodedObject(object) {
    if (object) {
      this.draco.destroy(object);
    }
  }
  encodeSync(mesh) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log = noop;
    this._setOptions(options);
    return options.pointcloud ? this._encodePointCloud(mesh, options) : this._encodeMesh(mesh, options);
  }
  _getAttributesFromMesh(mesh) {
    const attributes = {
      ...mesh,
      ...mesh.attributes
    };
    if (mesh.indices) {
      attributes.indices = mesh.indices;
    }
    return attributes;
  }
  _encodePointCloud(pointcloud, options) {
    const dracoPointCloud = new this.draco.PointCloud();
    if (options.metadata) {
      this._addGeometryMetadata(dracoPointCloud, options.metadata);
    }
    const attributes = this._getAttributesFromMesh(pointcloud);
    this._createDracoPointCloud(dracoPointCloud, attributes, options);
    const dracoData = new this.draco.DracoInt8Array();
    try {
      const encodedLen = this.dracoEncoder.EncodePointCloudToDracoBuffer(dracoPointCloud, false, dracoData);
      if (!(encodedLen > 0)) {
        throw new Error('Draco encoding failed.');
      }
      this.log("DRACO encoded ".concat(dracoPointCloud.num_points(), " points\n        with ").concat(dracoPointCloud.num_attributes(), " attributes into ").concat(encodedLen, " bytes"));
      return dracoInt8ArrayToArrayBuffer(dracoData);
    } finally {
      this.destroyEncodedObject(dracoData);
      this.destroyEncodedObject(dracoPointCloud);
    }
  }
  _encodeMesh(mesh, options) {
    const dracoMesh = new this.draco.Mesh();
    if (options.metadata) {
      this._addGeometryMetadata(dracoMesh, options.metadata);
    }
    const attributes = this._getAttributesFromMesh(mesh);
    this._createDracoMesh(dracoMesh, attributes, options);
    const dracoData = new this.draco.DracoInt8Array();
    try {
      const encodedLen = this.dracoEncoder.EncodeMeshToDracoBuffer(dracoMesh, dracoData);
      if (encodedLen <= 0) {
        throw new Error('Draco encoding failed.');
      }
      this.log("DRACO encoded ".concat(dracoMesh.num_points(), " points\n        with ").concat(dracoMesh.num_attributes(), " attributes into ").concat(encodedLen, " bytes"));
      return dracoInt8ArrayToArrayBuffer(dracoData);
    } finally {
      this.destroyEncodedObject(dracoData);
      this.destroyEncodedObject(dracoMesh);
    }
  }
  _setOptions(options) {
    if ('speed' in options) {
      this.dracoEncoder.SetSpeedOptions(...options.speed);
    }
    if ('method' in options) {
      const dracoMethod = this.draco[options.method || 'MESH_SEQUENTIAL_ENCODING'];
      this.dracoEncoder.SetEncodingMethod(dracoMethod);
    }
    if ('quantization' in options) {
      for (const attribute in options.quantization) {
        const bits = options.quantization[attribute];
        const dracoPosition = this.draco[attribute];
        this.dracoEncoder.SetAttributeQuantization(dracoPosition, bits);
      }
    }
  }
  _createDracoMesh(dracoMesh, attributes, options) {
    const optionalMetadata = options.attributesMetadata || {};
    try {
      const positions = this._getPositionAttribute(attributes);
      if (!positions) {
        throw new Error('positions');
      }
      const vertexCount = positions.length / 3;
      for (let attributeName in attributes) {
        const attribute = attributes[attributeName];
        attributeName = GLTF_TO_DRACO_ATTRIBUTE_NAME_MAP[attributeName] || attributeName;
        const uniqueId = this._addAttributeToMesh(dracoMesh, attributeName, attribute, vertexCount);
        if (uniqueId !== -1) {
          this._addAttributeMetadata(dracoMesh, uniqueId, {
            name: attributeName,
            ...(optionalMetadata[attributeName] || {})
          });
        }
      }
    } catch (error) {
      this.destroyEncodedObject(dracoMesh);
      throw error;
    }
    return dracoMesh;
  }
  _createDracoPointCloud(dracoPointCloud, attributes, options) {
    const optionalMetadata = options.attributesMetadata || {};
    try {
      const positions = this._getPositionAttribute(attributes);
      if (!positions) {
        throw new Error('positions');
      }
      const vertexCount = positions.length / 3;
      for (let attributeName in attributes) {
        const attribute = attributes[attributeName];
        attributeName = GLTF_TO_DRACO_ATTRIBUTE_NAME_MAP[attributeName] || attributeName;
        const uniqueId = this._addAttributeToMesh(dracoPointCloud, attributeName, attribute, vertexCount);
        if (uniqueId !== -1) {
          this._addAttributeMetadata(dracoPointCloud, uniqueId, {
            name: attributeName,
            ...(optionalMetadata[attributeName] || {})
          });
        }
      }
    } catch (error) {
      this.destroyEncodedObject(dracoPointCloud);
      throw error;
    }
    return dracoPointCloud;
  }
  _addAttributeToMesh(mesh, attributeName, attribute, vertexCount) {
    if (!ArrayBuffer.isView(attribute)) {
      return -1;
    }
    const type = this._getDracoAttributeType(attributeName);
    const size = attribute.length / vertexCount;
    if (type === 'indices') {
      const numFaces = attribute.length / 3;
      this.log("Adding attribute ".concat(attributeName, ", size ").concat(numFaces));
      this.dracoMeshBuilder.AddFacesToMesh(mesh, numFaces, attribute);
      return -1;
    }
    this.log("Adding attribute ".concat(attributeName, ", size ").concat(size));
    const builder = this.dracoMeshBuilder;
    const {
      buffer
    } = attribute;
    switch (attribute.constructor) {
      case Int8Array:
        return builder.AddInt8Attribute(mesh, type, vertexCount, size, new Int8Array(buffer));
      case Int16Array:
        return builder.AddInt16Attribute(mesh, type, vertexCount, size, new Int16Array(buffer));
      case Int32Array:
        return builder.AddInt32Attribute(mesh, type, vertexCount, size, new Int32Array(buffer));
      case Uint8Array:
      case Uint8ClampedArray:
        return builder.AddUInt8Attribute(mesh, type, vertexCount, size, new Uint8Array(buffer));
      case Uint16Array:
        return builder.AddUInt16Attribute(mesh, type, vertexCount, size, new Uint16Array(buffer));
      case Uint32Array:
        return builder.AddUInt32Attribute(mesh, type, vertexCount, size, new Uint32Array(buffer));
      case Float32Array:
      default:
        return builder.AddFloatAttribute(mesh, type, vertexCount, size, new Float32Array(buffer));
    }
  }
  _getDracoAttributeType(attributeName) {
    switch (attributeName.toLowerCase()) {
      case 'indices':
        return 'indices';
      case 'position':
      case 'positions':
      case 'vertices':
        return this.draco.POSITION;
      case 'normal':
      case 'normals':
        return this.draco.NORMAL;
      case 'color':
      case 'colors':
        return this.draco.COLOR;
      case 'texcoord':
      case 'texcoords':
        return this.draco.TEX_COORD;
      default:
        return this.draco.GENERIC;
    }
  }
  _getPositionAttribute(attributes) {
    for (const attributeName in attributes) {
      const attribute = attributes[attributeName];
      const dracoType = this._getDracoAttributeType(attributeName);
      if (dracoType === this.draco.POSITION) {
        return attribute;
      }
    }
    return null;
  }
  _addGeometryMetadata(dracoGeometry, metadata) {
    const dracoMetadata = new this.draco.Metadata();
    this._populateDracoMetadata(dracoMetadata, metadata);
    this.dracoMeshBuilder.AddMetadata(dracoGeometry, dracoMetadata);
  }
  _addAttributeMetadata(dracoGeometry, uniqueAttributeId, metadata) {
    const dracoAttributeMetadata = new this.draco.Metadata();
    this._populateDracoMetadata(dracoAttributeMetadata, metadata);
    this.dracoMeshBuilder.SetMetadataForAttribute(dracoGeometry, uniqueAttributeId, dracoAttributeMetadata);
  }
  _populateDracoMetadata(dracoMetadata, metadata) {
    for (const [key, value] of getEntries(metadata)) {
      switch (typeof value) {
        case 'number':
          if (Math.trunc(value) === value) {
            this.dracoMetadataBuilder.AddIntEntry(dracoMetadata, key, value);
          } else {
            this.dracoMetadataBuilder.AddDoubleEntry(dracoMetadata, key, value);
          }
          break;
        case 'object':
          if (value instanceof Int32Array) {
            this.dracoMetadataBuilder.AddIntEntryArray(dracoMetadata, key, value, value.length);
          }
          break;
        case 'string':
        default:
          this.dracoMetadataBuilder.AddStringEntry(dracoMetadata, key, value);
      }
    }
  }
}
function dracoInt8ArrayToArrayBuffer(dracoData) {
  const byteLength = dracoData.size();
  const outputBuffer = new ArrayBuffer(byteLength);
  const outputData = new Int8Array(outputBuffer);
  for (let i = 0; i < byteLength; ++i) {
    outputData[i] = dracoData.GetValue(i);
  }
  return outputBuffer;
}
function getEntries(container) {
  const hasEntriesFunc = container.entries && !container.hasOwnProperty('entries');
  return hasEntriesFunc ? container.entries() : Object.entries(container);
}
//# sourceMappingURL=draco-builder.js.map