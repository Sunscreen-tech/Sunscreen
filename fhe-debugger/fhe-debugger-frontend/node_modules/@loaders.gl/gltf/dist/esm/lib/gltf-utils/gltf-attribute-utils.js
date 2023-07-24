import { getAccessorTypeFromSize, getComponentTypeFromArray } from './gltf-utils';
export function getGLTFAccessors(attributes) {
  const accessors = {};
  for (const name in attributes) {
    const attribute = attributes[name];
    if (name !== 'indices') {
      const glTFAccessor = getGLTFAccessor(attribute);
      accessors[name] = glTFAccessor;
    }
  }
  return accessors;
}
export function getGLTFAccessor(attribute) {
  const {
    buffer,
    size,
    count
  } = getAccessorData(attribute);
  const glTFAccessor = {
    value: buffer,
    size,
    byteOffset: 0,
    count,
    type: getAccessorTypeFromSize(size),
    componentType: getComponentTypeFromArray(buffer)
  };
  return glTFAccessor;
}
function getAccessorData(attribute) {
  let buffer = attribute;
  let size = 1;
  let count = 0;
  if (attribute && attribute.value) {
    buffer = attribute.value;
    size = attribute.size || 1;
  }
  if (buffer) {
    if (!ArrayBuffer.isView(buffer)) {
      buffer = toTypedArray(buffer, Float32Array);
    }
    count = buffer.length / size;
  }
  return {
    buffer,
    size,
    count
  };
}
function toTypedArray(array, ArrayType) {
  let convertTypedArrays = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  if (!array) {
    return null;
  }
  if (Array.isArray(array)) {
    return new ArrayType(array);
  }
  if (convertTypedArrays && !(array instanceof ArrayType)) {
    return new ArrayType(array);
  }
  return array;
}
//# sourceMappingURL=gltf-attribute-utils.js.map