import { TypedArray } from '../../types';
/**
 * Helper function that pads a string with spaces to fit a certain byte alignment
 * @param string
 * @param byteAlignment
 * @returns
 *
 * @todo PERFORMANCE IDEA: No need to copy string twice...
 */
export declare function padStringToByteAlignment(string: string, byteAlignment: number): string;
/**
 *
 * @param dataView
 * @param byteOffset
 * @param string
 * @param byteLength
 * @returns
 */
export declare function copyStringToDataView(dataView: DataView, byteOffset: number, string: string, byteLength: number): number;
export declare function copyBinaryToDataView(dataView: any, byteOffset: any, binary: any, byteLength: any): any;
/**
 * Copy sourceBuffer to dataView with some padding
 *
 * @param dataView - destination data container. If null - only new offset is calculated
 * @param byteOffset - destination byte offset to copy to
 * @param sourceBuffer - source data buffer
 * @param padding - pad the resulting array to multiple of "padding" bytes. Additional bytes are filled with 0x20 (ASCII space)
 *
 * @return new byteOffset of resulting dataView
 */
export declare function copyPaddedArrayBufferToDataView(dataView: DataView | null, byteOffset: number, sourceBuffer: TypedArray, padding: number): number;
/**
 * Copy string to dataView with some padding
 *
 * @param {DataView | null} dataView - destination data container. If null - only new offset is calculated
 * @param {number} byteOffset - destination byte offset to copy to
 * @param {string} string - source string
 * @param {number} padding - pad the resulting array to multiple of "padding" bytes. Additional bytes are filled with 0x20 (ASCII space)
 *
 * @return new byteOffset of resulting dataView
 */
export declare function copyPaddedStringToDataView(dataView: DataView | null, byteOffset: number, string: string, padding: number): number;
//# sourceMappingURL=dataview-copy-utils.d.ts.map