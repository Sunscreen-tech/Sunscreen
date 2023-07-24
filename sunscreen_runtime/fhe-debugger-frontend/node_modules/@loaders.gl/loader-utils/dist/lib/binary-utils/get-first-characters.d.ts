/**
 * Get the first characters from a binary file (interpret the first bytes as an ASCII string)
 * @param data
 * @param length
 * @returns
 */
export declare function getFirstCharacters(data: string | ArrayBuffer, length?: number): string;
/**
 * Gets a magic string from a "file"
 * Typically used to check or detect file format
 * @param arrayBuffer
 * @param byteOffset
 * @param length
 * @returns
 */
export declare function getMagicString(arrayBuffer: ArrayBuffer, byteOffset: number, length: number): string;
//# sourceMappingURL=get-first-characters.d.ts.map