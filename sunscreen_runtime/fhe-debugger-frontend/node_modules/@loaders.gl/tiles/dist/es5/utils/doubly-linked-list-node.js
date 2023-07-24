"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DoublyLinkedListNode = void 0;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var DoublyLinkedListNode = (0, _createClass2.default)(function DoublyLinkedListNode(item, previous, next) {
  (0, _classCallCheck2.default)(this, DoublyLinkedListNode);
  (0, _defineProperty2.default)(this, "item", void 0);
  (0, _defineProperty2.default)(this, "previous", void 0);
  (0, _defineProperty2.default)(this, "next", void 0);
  this.item = item;
  this.previous = previous;
  this.next = next;
});
exports.DoublyLinkedListNode = DoublyLinkedListNode;
//# sourceMappingURL=doubly-linked-list-node.js.map