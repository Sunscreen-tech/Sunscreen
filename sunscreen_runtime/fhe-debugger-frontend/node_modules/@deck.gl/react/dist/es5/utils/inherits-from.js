"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inheritsFrom = inheritsFrom;

function inheritsFrom(Type, ParentType) {
  while (Type) {
    if (Type === ParentType) {
      return true;
    }

    Type = Object.getPrototypeOf(Type);
  }

  return false;
}
//# sourceMappingURL=inherits-from.js.map