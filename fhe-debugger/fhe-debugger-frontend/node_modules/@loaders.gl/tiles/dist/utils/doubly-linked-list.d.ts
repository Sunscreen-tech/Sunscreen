import { DoublyLinkedListNode } from './doubly-linked-list-node';
/**
 * Doubly linked list
 * @private
 */
export declare class DoublyLinkedList {
    head: DoublyLinkedListNode | null;
    tail: DoublyLinkedListNode | null;
    _length: number;
    get length(): number;
    /**
     * Adds the item to the end of the list
     * @param {*} [item]
     * @return {DoublyLinkedListNode}
     */
    add(item: any): DoublyLinkedListNode;
    /**
     * Removes the given node from the list
     * @param {DoublyLinkedListNode} node
     */
    remove(node: any): void;
    /**
     * Moves nextNode after node
     * @param {DoublyLinkedListNode} node
     * @param {DoublyLinkedListNode} nextNode
     */
    splice(node: any, nextNode: any): void;
    _insert(node: any, nextNode: any): void;
}
//# sourceMappingURL=doubly-linked-list.d.ts.map