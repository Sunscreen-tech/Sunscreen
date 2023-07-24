"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const GL_TYPE_TO_ARRAY_TYPE = {
    [constants_1.GL_TYPE.DOUBLE]: Float64Array,
    [constants_1.GL_TYPE.FLOAT]: Float32Array,
    [constants_1.GL_TYPE.UNSIGNED_SHORT]: Uint16Array,
    [constants_1.GL_TYPE.UNSIGNED_INT]: Uint32Array,
    [constants_1.GL_TYPE.UNSIGNED_BYTE]: Uint8Array,
    [constants_1.GL_TYPE.BYTE]: Int8Array,
    [constants_1.GL_TYPE.SHORT]: Int16Array,
    [constants_1.GL_TYPE.INT]: Int32Array
};
const NAME_TO_GL_TYPE = {
    DOUBLE: constants_1.GL_TYPE.DOUBLE,
    FLOAT: constants_1.GL_TYPE.FLOAT,
    UNSIGNED_SHORT: constants_1.GL_TYPE.UNSIGNED_SHORT,
    UNSIGNED_INT: constants_1.GL_TYPE.UNSIGNED_INT,
    UNSIGNED_BYTE: constants_1.GL_TYPE.UNSIGNED_BYTE,
    BYTE: constants_1.GL_TYPE.BYTE,
    SHORT: constants_1.GL_TYPE.SHORT,
    INT: constants_1.GL_TYPE.INT
};
const ERR_TYPE_CONVERSION = 'Failed to convert GL type';
// Converts TYPED ARRAYS to corresponding GL constant
// Used to auto deduce gl parameter types
class GLType {
    // Signature: fromTypedArray(new Uint8Array())
    // Signature: fromTypedArray(Uint8Array)
    /**
     * Returns the size, in bytes, of the corresponding datatype
     * @param arrayOrType
     * @returns glType a a string
     */
    static fromTypedArray(arrayOrType) {
        // If typed array, look up constructor
        arrayOrType = ArrayBuffer.isView(arrayOrType) ? arrayOrType.constructor : arrayOrType;
        for (const glType in GL_TYPE_TO_ARRAY_TYPE) {
            const ArrayType = GL_TYPE_TO_ARRAY_TYPE[glType];
            if (ArrayType === arrayOrType) {
                return glType;
            }
        }
        throw new Error(ERR_TYPE_CONVERSION);
    }
    /**
     * Extracts name for glType from array NAME_TO_GL_TYPE
     * @param name
     * @returns glType as a number
     */
    static fromName(name) {
        const glType = NAME_TO_GL_TYPE[name];
        if (!glType) {
            throw new Error(ERR_TYPE_CONVERSION);
        }
        return glType;
    }
    // Converts GL constant to corresponding typed array type
    // eslint-disable-next-line complexity
    static getArrayType(glType) {
        switch (glType) {
            /*eslint-disable*/
            // @ts-ignore
            case constants_1.GL_TYPE.UNSIGNED_SHORT_5_6_5:
            // @ts-ignore
            case constants_1.GL_TYPE.UNSIGNED_SHORT_4_4_4_4:
            // @ts-ignore
            case constants_1.GL_TYPE.UNSIGNED_SHORT_5_5_5_1:
                /* eslint-enable*/
                return Uint16Array;
            default:
                const ArrayType = GL_TYPE_TO_ARRAY_TYPE[glType];
                if (!ArrayType) {
                    throw new Error(ERR_TYPE_CONVERSION);
                }
                return ArrayType;
        }
    }
    /**
     * Returns the size in bytes of one element of the provided WebGL type
     * @param glType
     * @returns size of glType
     */
    static getByteSize(glType) {
        const ArrayType = GLType.getArrayType(glType);
        return ArrayType.BYTES_PER_ELEMENT;
    }
    /**
     * Returns `true` if `glType` is a valid WebGL data type.
     * @param glType
     * @returns boolean
     */
    static validate(glType) {
        return Boolean(GLType.getArrayType(glType));
    }
    /**
     * Creates a typed view of an array of bytes
     * @param glType The type of typed array (ArrayBuffer view) to create
     * @param buffer The buffer storage to use for the view.
     * @param byteOffset The offset, in bytes, to the first element in the view
     * @param length The number of elements in the view. Defaults to buffer length
     * @returns A typed array view of the buffer
     */
    static createTypedArray(glType, buffer, byteOffset = 0, length) {
        if (length === undefined) {
            length = (buffer.byteLength - byteOffset) / GLType.getByteSize(glType);
        }
        const ArrayType = GLType.getArrayType(glType);
        return new ArrayType(buffer, byteOffset, length);
    }
}
exports.default = GLType;
