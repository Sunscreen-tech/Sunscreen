/**
 * Extracts a value or array and always return an array
 * Useful since XML parses to object instead of array when only a single value is provided
 */
export declare function convertXMLValueToArray(xmlValue: unknown): unknown[];
/**
 * Mutates a field in place, converting it to array
 * Useful since XML parses to object instead of array when only a single value is provided
 */
export declare function convertXMLFieldToArrayInPlace(xml: any, key: string): void;
//# sourceMappingURL=xml-utils.d.ts.map