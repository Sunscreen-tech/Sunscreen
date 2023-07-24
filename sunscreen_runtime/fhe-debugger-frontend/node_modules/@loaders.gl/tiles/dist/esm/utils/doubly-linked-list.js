import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { DoublyLinkedListNode } from './doubly-linked-list-node';
export class DoublyLinkedList {
  constructor() {
    _defineProperty(this, "head", null);
    _defineProperty(this, "tail", null);
    _defineProperty(this, "_length", 0);
  }
  get length() {
    return this._length;
  }
  add(item) {
    const node = new DoublyLinkedListNode(item, this.tail, null);
    if (this.tail) {
      this.tail.next = node;
      this.tail = node;
    } else {
      this.head = node;
      this.tail = node;
    }
    ++this._length;
    return node;
  }
  remove(node) {
    if (!node) {
      return;
    }
    if (node.previous && node.next) {
      node.previous.next = node.next;
      node.next.previous = node.previous;
    } else if (node.previous) {
      node.previous.next = null;
      this.tail = node.previous;
    } else if (node.next) {
      node.next.previous = null;
      this.head = node.next;
    } else {
      this.head = null;
      this.tail = null;
    }
    node.next = null;
    node.previous = null;
    --this._length;
  }
  splice(node, nextNode) {
    if (node === nextNode) {
      return;
    }
    this.remove(nextNode);
    this._insert(node, nextNode);
  }
  _insert(node, nextNode) {
    const oldNodeNext = node.next;
    node.next = nextNode;
    if (this.tail === node) {
      this.tail = nextNode;
    } else {
      oldNodeNext.previous = nextNode;
    }
    nextNode.next = oldNodeNext;
    nextNode.previous = node;
    ++this._length;
  }
}
//# sourceMappingURL=doubly-linked-list.js.map