"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DoublyLinkedList = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _doublyLinkedListNode = require("./doubly-linked-list-node");
var DoublyLinkedList = function () {
  function DoublyLinkedList() {
    (0, _classCallCheck2.default)(this, DoublyLinkedList);
    (0, _defineProperty2.default)(this, "head", null);
    (0, _defineProperty2.default)(this, "tail", null);
    (0, _defineProperty2.default)(this, "_length", 0);
  }
  (0, _createClass2.default)(DoublyLinkedList, [{
    key: "length",
    get: function get() {
      return this._length;
    }
  }, {
    key: "add",
    value: function add(item) {
      var node = new _doublyLinkedListNode.DoublyLinkedListNode(item, this.tail, null);
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
  }, {
    key: "remove",
    value: function remove(node) {
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
  }, {
    key: "splice",
    value: function splice(node, nextNode) {
      if (node === nextNode) {
        return;
      }
      this.remove(nextNode);
      this._insert(node, nextNode);
    }
  }, {
    key: "_insert",
    value: function _insert(node, nextNode) {
      var oldNodeNext = node.next;
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
  }]);
  return DoublyLinkedList;
}();
exports.DoublyLinkedList = DoublyLinkedList;
//# sourceMappingURL=doubly-linked-list.js.map