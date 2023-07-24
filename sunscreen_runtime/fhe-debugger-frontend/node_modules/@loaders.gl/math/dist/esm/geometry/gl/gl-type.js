import { GL_TYPE as GL } from '../constants';
const GL_TYPE_TO_ARRAY_TYPE = {
  [GL.DOUBLE]: Float64Array,
  [GL.FLOAT]: Float32Array,
  [GL.UNSIGNED_SHORT]: Uint16Array,
  [GL.UNSIGNED_INT]: Uint32Array,
  [GL.UNSIGNED_BYTE]: Uint8Array,
  [GL.BYTE]: Int8Array,
  [GL.SHORT]: Int16Array,
  [GL.INT]: Int32Array
};
const NAME_TO_GL_TYPE = {
  DOUBLE: GL.DOUBLE,
  FLOAT: GL.FLOAT,
  UNSIGNED_SHORT: GL.UNSIGNED_SHORT,
  UNSIGNED_INT: GL.UNSIGNED_INT,
  UNSIGNED_BYTE: GL.UNSIGNED_BYTE,
  BYTE: GL.BYTE,
  SHORT: GL.SHORT,
  INT: GL.INT
};
const ERR_TYPE_CONVERSION = 'Failed to convert GL type';
export default class GLType {
  static fromTypedArray(arrayOrType) {
    arrayOrType = ArrayBuffer.isView(arrayOrType) ? arrayOrType.constructor : arrayOrType;
    for (const glType in GL_TYPE_TO_ARRAY_TYPE) {
      const ArrayType = GL_TYPE_TO_ARRAY_TYPE[glType];
      if (ArrayType === arrayOrType) {
        return glType;
      }
    }
    throw new Error(ERR_TYPE_CONVERSION);
  }
  static fromName(name) {
    const glType = NAME_TO_GL_TYPE[name];
    if (!glType) {
      throw new Error(ERR_TYPE_CONVERSION);
    }
    return glType;
  }
  static getArrayType(glType) {
    switch (glType) {
      case GL.UNSIGNED_SHORT_5_6_5:
      case GL.UNSIGNED_SHORT_4_4_4_4:
      case GL.UNSIGNED_SHORT_5_5_5_1:
        return Uint16Array;
      default:
        const ArrayType = GL_TYPE_TO_ARRAY_TYPE[glType];
        if (!ArrayType) {
          throw new Error(ERR_TYPE_CONVERSION);
        }
        return ArrayType;
    }
  }
  static getByteSize(glType) {
    const ArrayType = GLType.getArrayType(glType);
    return ArrayType.BYTES_PER_ELEMENT;
  }
  static validate(glType) {
    return Boolean(GLType.getArrayType(glType));
  }
  static createTypedArray(glType, buffer) {
    let byteOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    let length = arguments.length > 3 ? arguments[3] : undefined;
    if (length === undefined) {
      length = (buffer.byteLength - byteOffset) / GLType.getByteSize(glType);
    }
    const ArrayType = GLType.getArrayType(glType);
    return new ArrayType(buffer, byteOffset, length);
  }
}
//# sourceMappingURL=gl-type.js.map