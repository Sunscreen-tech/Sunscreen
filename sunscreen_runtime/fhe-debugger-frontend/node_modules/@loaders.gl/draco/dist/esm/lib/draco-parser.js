import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { getMeshBoundingBox } from '@loaders.gl/schema';
import { getDracoSchema } from './utils/get-draco-schema';
const GEOMETRY_TYPE = {
  TRIANGULAR_MESH: 0,
  POINT_CLOUD: 1
};
const DRACO_TO_GLTF_ATTRIBUTE_NAME_MAP = {
  POSITION: 'POSITION',
  NORMAL: 'NORMAL',
  COLOR: 'COLOR_0',
  TEX_COORD: 'TEXCOORD_0'
};
const DRACO_DATA_TYPE_TO_TYPED_ARRAY_MAP = {
  1: Int8Array,
  2: Uint8Array,
  3: Int16Array,
  4: Uint16Array,
  5: Int32Array,
  6: Uint32Array,
  9: Float32Array
};
const INDEX_ITEM_SIZE = 4;
export default class DracoParser {
  constructor(draco) {
    _defineProperty(this, "draco", void 0);
    _defineProperty(this, "decoder", void 0);
    _defineProperty(this, "metadataQuerier", void 0);
    this.draco = draco;
    this.decoder = new this.draco.Decoder();
    this.metadataQuerier = new this.draco.MetadataQuerier();
  }
  destroy() {
    this.draco.destroy(this.decoder);
    this.draco.destroy(this.metadataQuerier);
  }
  parseSync(arrayBuffer) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const buffer = new this.draco.DecoderBuffer();
    buffer.Init(new Int8Array(arrayBuffer), arrayBuffer.byteLength);
    this._disableAttributeTransforms(options);
    const geometry_type = this.decoder.GetEncodedGeometryType(buffer);
    const dracoGeometry = geometry_type === this.draco.TRIANGULAR_MESH ? new this.draco.Mesh() : new this.draco.PointCloud();
    try {
      let dracoStatus;
      switch (geometry_type) {
        case this.draco.TRIANGULAR_MESH:
          dracoStatus = this.decoder.DecodeBufferToMesh(buffer, dracoGeometry);
          break;
        case this.draco.POINT_CLOUD:
          dracoStatus = this.decoder.DecodeBufferToPointCloud(buffer, dracoGeometry);
          break;
        default:
          throw new Error('DRACO: Unknown geometry type.');
      }
      if (!dracoStatus.ok() || !dracoGeometry.ptr) {
        const message = "DRACO decompression failed: ".concat(dracoStatus.error_msg());
        throw new Error(message);
      }
      const loaderData = this._getDracoLoaderData(dracoGeometry, geometry_type, options);
      const geometry = this._getMeshData(dracoGeometry, loaderData, options);
      const boundingBox = getMeshBoundingBox(geometry.attributes);
      const schema = getDracoSchema(geometry.attributes, loaderData, geometry.indices);
      const data = {
        loader: 'draco',
        loaderData,
        header: {
          vertexCount: dracoGeometry.num_points(),
          boundingBox
        },
        ...geometry,
        schema
      };
      return data;
    } finally {
      this.draco.destroy(buffer);
      if (dracoGeometry) {
        this.draco.destroy(dracoGeometry);
      }
    }
  }
  _getDracoLoaderData(dracoGeometry, geometry_type, options) {
    const metadata = this._getTopLevelMetadata(dracoGeometry);
    const attributes = this._getDracoAttributes(dracoGeometry, options);
    return {
      geometry_type,
      num_attributes: dracoGeometry.num_attributes(),
      num_points: dracoGeometry.num_points(),
      num_faces: dracoGeometry instanceof this.draco.Mesh ? dracoGeometry.num_faces() : 0,
      metadata,
      attributes
    };
  }
  _getDracoAttributes(dracoGeometry, options) {
    const dracoAttributes = {};
    for (let attributeId = 0; attributeId < dracoGeometry.num_attributes(); attributeId++) {
      const dracoAttribute = this.decoder.GetAttribute(dracoGeometry, attributeId);
      const metadata = this._getAttributeMetadata(dracoGeometry, attributeId);
      dracoAttributes[dracoAttribute.unique_id()] = {
        unique_id: dracoAttribute.unique_id(),
        attribute_type: dracoAttribute.attribute_type(),
        data_type: dracoAttribute.data_type(),
        num_components: dracoAttribute.num_components(),
        byte_offset: dracoAttribute.byte_offset(),
        byte_stride: dracoAttribute.byte_stride(),
        normalized: dracoAttribute.normalized(),
        attribute_index: attributeId,
        metadata
      };
      const quantization = this._getQuantizationTransform(dracoAttribute, options);
      if (quantization) {
        dracoAttributes[dracoAttribute.unique_id()].quantization_transform = quantization;
      }
      const octahedron = this._getOctahedronTransform(dracoAttribute, options);
      if (octahedron) {
        dracoAttributes[dracoAttribute.unique_id()].octahedron_transform = octahedron;
      }
    }
    return dracoAttributes;
  }
  _getMeshData(dracoGeometry, loaderData, options) {
    const attributes = this._getMeshAttributes(loaderData, dracoGeometry, options);
    const positionAttribute = attributes.POSITION;
    if (!positionAttribute) {
      throw new Error('DRACO: No position attribute found.');
    }
    if (dracoGeometry instanceof this.draco.Mesh) {
      switch (options.topology) {
        case 'triangle-strip':
          return {
            topology: 'triangle-strip',
            mode: 4,
            attributes,
            indices: {
              value: this._getTriangleStripIndices(dracoGeometry),
              size: 1
            }
          };
        case 'triangle-list':
        default:
          return {
            topology: 'triangle-list',
            mode: 5,
            attributes,
            indices: {
              value: this._getTriangleListIndices(dracoGeometry),
              size: 1
            }
          };
      }
    }
    return {
      topology: 'point-list',
      mode: 0,
      attributes
    };
  }
  _getMeshAttributes(loaderData, dracoGeometry, options) {
    const attributes = {};
    for (const loaderAttribute of Object.values(loaderData.attributes)) {
      const attributeName = this._deduceAttributeName(loaderAttribute, options);
      loaderAttribute.name = attributeName;
      const {
        value,
        size
      } = this._getAttributeValues(dracoGeometry, loaderAttribute);
      attributes[attributeName] = {
        value,
        size,
        byteOffset: loaderAttribute.byte_offset,
        byteStride: loaderAttribute.byte_stride,
        normalized: loaderAttribute.normalized
      };
    }
    return attributes;
  }
  _getTriangleListIndices(dracoGeometry) {
    const numFaces = dracoGeometry.num_faces();
    const numIndices = numFaces * 3;
    const byteLength = numIndices * INDEX_ITEM_SIZE;
    const ptr = this.draco._malloc(byteLength);
    try {
      this.decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
      return new Uint32Array(this.draco.HEAPF32.buffer, ptr, numIndices).slice();
    } finally {
      this.draco._free(ptr);
    }
  }
  _getTriangleStripIndices(dracoGeometry) {
    const dracoArray = new this.draco.DracoInt32Array();
    try {
      this.decoder.GetTriangleStripsFromMesh(dracoGeometry, dracoArray);
      return getUint32Array(dracoArray);
    } finally {
      this.draco.destroy(dracoArray);
    }
  }
  _getAttributeValues(dracoGeometry, attribute) {
    const TypedArrayCtor = DRACO_DATA_TYPE_TO_TYPED_ARRAY_MAP[attribute.data_type];
    const numComponents = attribute.num_components;
    const numPoints = dracoGeometry.num_points();
    const numValues = numPoints * numComponents;
    const byteLength = numValues * TypedArrayCtor.BYTES_PER_ELEMENT;
    const dataType = getDracoDataType(this.draco, TypedArrayCtor);
    let value;
    const ptr = this.draco._malloc(byteLength);
    try {
      const dracoAttribute = this.decoder.GetAttribute(dracoGeometry, attribute.attribute_index);
      this.decoder.GetAttributeDataArrayForAllPoints(dracoGeometry, dracoAttribute, dataType, byteLength, ptr);
      value = new TypedArrayCtor(this.draco.HEAPF32.buffer, ptr, numValues).slice();
    } finally {
      this.draco._free(ptr);
    }
    return {
      value,
      size: numComponents
    };
  }
  _deduceAttributeName(attribute, options) {
    const uniqueId = attribute.unique_id;
    for (const [attributeName, attributeUniqueId] of Object.entries(options.extraAttributes || {})) {
      if (attributeUniqueId === uniqueId) {
        return attributeName;
      }
    }
    const thisAttributeType = attribute.attribute_type;
    for (const dracoAttributeConstant in DRACO_TO_GLTF_ATTRIBUTE_NAME_MAP) {
      const attributeType = this.draco[dracoAttributeConstant];
      if (attributeType === thisAttributeType) {
        return DRACO_TO_GLTF_ATTRIBUTE_NAME_MAP[dracoAttributeConstant];
      }
    }
    const entryName = options.attributeNameEntry || 'name';
    if (attribute.metadata[entryName]) {
      return attribute.metadata[entryName].string;
    }
    return "CUSTOM_ATTRIBUTE_".concat(uniqueId);
  }
  _getTopLevelMetadata(dracoGeometry) {
    const dracoMetadata = this.decoder.GetMetadata(dracoGeometry);
    return this._getDracoMetadata(dracoMetadata);
  }
  _getAttributeMetadata(dracoGeometry, attributeId) {
    const dracoMetadata = this.decoder.GetAttributeMetadata(dracoGeometry, attributeId);
    return this._getDracoMetadata(dracoMetadata);
  }
  _getDracoMetadata(dracoMetadata) {
    if (!dracoMetadata || !dracoMetadata.ptr) {
      return {};
    }
    const result = {};
    const numEntries = this.metadataQuerier.NumEntries(dracoMetadata);
    for (let entryIndex = 0; entryIndex < numEntries; entryIndex++) {
      const entryName = this.metadataQuerier.GetEntryName(dracoMetadata, entryIndex);
      result[entryName] = this._getDracoMetadataField(dracoMetadata, entryName);
    }
    return result;
  }
  _getDracoMetadataField(dracoMetadata, entryName) {
    const dracoArray = new this.draco.DracoInt32Array();
    try {
      this.metadataQuerier.GetIntEntryArray(dracoMetadata, entryName, dracoArray);
      const intArray = getInt32Array(dracoArray);
      return {
        int: this.metadataQuerier.GetIntEntry(dracoMetadata, entryName),
        string: this.metadataQuerier.GetStringEntry(dracoMetadata, entryName),
        double: this.metadataQuerier.GetDoubleEntry(dracoMetadata, entryName),
        intArray
      };
    } finally {
      this.draco.destroy(dracoArray);
    }
  }
  _disableAttributeTransforms(options) {
    const {
      quantizedAttributes = [],
      octahedronAttributes = []
    } = options;
    const skipAttributes = [...quantizedAttributes, ...octahedronAttributes];
    for (const dracoAttributeName of skipAttributes) {
      this.decoder.SkipAttributeTransform(this.draco[dracoAttributeName]);
    }
  }
  _getQuantizationTransform(dracoAttribute, options) {
    const {
      quantizedAttributes = []
    } = options;
    const attribute_type = dracoAttribute.attribute_type();
    const skip = quantizedAttributes.map(type => this.decoder[type]).includes(attribute_type);
    if (skip) {
      const transform = new this.draco.AttributeQuantizationTransform();
      try {
        if (transform.InitFromAttribute(dracoAttribute)) {
          return {
            quantization_bits: transform.quantization_bits(),
            range: transform.range(),
            min_values: new Float32Array([1, 2, 3]).map(i => transform.min_value(i))
          };
        }
      } finally {
        this.draco.destroy(transform);
      }
    }
    return null;
  }
  _getOctahedronTransform(dracoAttribute, options) {
    const {
      octahedronAttributes = []
    } = options;
    const attribute_type = dracoAttribute.attribute_type();
    const octahedron = octahedronAttributes.map(type => this.decoder[type]).includes(attribute_type);
    if (octahedron) {
      const transform = new this.draco.AttributeQuantizationTransform();
      try {
        if (transform.InitFromAttribute(dracoAttribute)) {
          return {
            quantization_bits: transform.quantization_bits()
          };
        }
      } finally {
        this.draco.destroy(transform);
      }
    }
    return null;
  }
}
function getDracoDataType(draco, attributeType) {
  switch (attributeType) {
    case Float32Array:
      return draco.DT_FLOAT32;
    case Int8Array:
      return draco.DT_INT8;
    case Int16Array:
      return draco.DT_INT16;
    case Int32Array:
      return draco.DT_INT32;
    case Uint8Array:
      return draco.DT_UINT8;
    case Uint16Array:
      return draco.DT_UINT16;
    case Uint32Array:
      return draco.DT_UINT32;
    default:
      return draco.DT_INVALID;
  }
}
function getInt32Array(dracoArray) {
  const numValues = dracoArray.size();
  const intArray = new Int32Array(numValues);
  for (let i = 0; i < numValues; i++) {
    intArray[i] = dracoArray.GetValue(i);
  }
  return intArray;
}
function getUint32Array(dracoArray) {
  const numValues = dracoArray.size();
  const intArray = new Int32Array(numValues);
  for (let i = 0; i < numValues; i++) {
    intArray[i] = dracoArray.GetValue(i);
  }
  return intArray;
}
//# sourceMappingURL=draco-parser.js.map