/**
 * A wrapper around arrays so that the internal length of the array can be manually managed.
 *
 * @alias ManagedArray
 * @constructor
 * @private
 *
 * @param {Number} [length=0] The initial length of the array.
 */
export declare class ManagedArray {
    _map: Map<any, any>;
    _array: any[];
    _length: number;
    constructor(length?: number);
    /**
     * Gets or sets the length of the array.
     * If the set length is greater than the length of the internal array, the internal array is resized.
     *
     * @memberof ManagedArray.prototype
     * @type Number
     */
    get length(): number;
    set length(length: number);
    /**
     * Gets the internal array.
     *
     * @memberof ManagedArray.prototype
     * @type Array
     * @readonly
     */
    get values(): any[];
    /**
     * Gets the element at an index.
     *
     * @param {Number} index The index to get.
     */
    get(index: any): any;
    /**
     * Sets the element at an index. Resizes the array if index is greater than the length of the array.
     *
     * @param {Number} index The index to set.
     * @param {*} element The element to set at index.
     */
    set(index: any, element: any): void;
    delete(element: any): void;
    /**
     * Returns the last element in the array without modifying the array.
     *
     * @returns {*} The last element in the array.
     */
    peek(): any;
    /**
     * Push an element into the array.
     *
     * @param {*} element The element to push.
     */
    push(element: any): void;
    /**
     * Pop an element from the array.
     *
     * @returns {*} The last element in the array.
     */
    pop(): any;
    /**
     * Resize the internal array if length > _array.length.
     *
     * @param {Number} length The length.
     */
    reserve(length: any): void;
    /**
     * Resize the array.
     *
     * @param {Number} length The length.
     */
    resize(length: any): void;
    /**
     * Trim the internal array to the specified length. Defaults to the current length.
     *
     * @param {Number} [length] The length.
     */
    trim(length: any): void;
    reset(): void;
    find(target: any): boolean;
}
//# sourceMappingURL=managed-array.d.ts.map