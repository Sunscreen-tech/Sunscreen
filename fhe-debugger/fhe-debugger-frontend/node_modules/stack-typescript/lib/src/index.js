"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const linked_list_typescript_1 = require("linked-list-typescript");
class Stack extends linked_list_typescript_1.LinkedList {
    constructor(...values) {
        super(...values);
    }
    get top() {
        return this.head;
    }
    get size() {
        return this.length;
    }
    push(val) {
        this.prepend(val);
    }
    pop() {
        return this.removeHead();
    }
}
exports.Stack = Stack;
//# sourceMappingURL=index.js.map