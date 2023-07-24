import type { TypedArray } from '@math.gl/core';
export default class GLType {
    /**
     * Returns the size, in bytes, of the corresponding datatype
     * @param arrayOrType
     * @returns glType a a string
     */
    static fromTypedArray(arrayOrType: TypedArray | Function): string;
    /**
     * Extracts name for glType from array NAME_TO_GL_TYPE
     * @param name
     * @returns glType as a number
     */
    static fromName(name: string): number;
    static getArrayType(glType: number): Float64ArrayConstructor | Float32ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor | Uint8ArrayConstructor | Int8ArrayConstructor | Int16ArrayConstructor | Int32ArrayConstructor;
    /**
     * Returns the size in bytes of one element of the provided WebGL type
     * @param glType
     * @returns size of glType
     */
    static getByteSize(glType: number): number;
    /**
     * Returns `true` if `glType` is a valid WebGL data type.
     * @param glType
     * @returns boolean
     */
    static validate(glType: number): boolean;
    /**
     * Creates a typed view of an array of bytes
     * @param glType The type of typed array (ArrayBuffer view) to create
     * @param buffer The buffer storage to use for the view.
     * @param byteOffset The offset, in bytes, to the first element in the view
     * @param length The number of elements in the view. Defaults to buffer length
     * @returns A typed array view of the buffer
     */
    static createTypedArray(glType: number, buffer: TypedArray, byteOffset?: number, length?: number): TypedArray;
}
//# sourceMappingURL=gl-type.d.ts.map