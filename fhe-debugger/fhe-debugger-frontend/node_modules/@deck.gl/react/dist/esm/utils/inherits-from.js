export function inheritsFrom(Type, ParentType) {
  while (Type) {
    if (Type === ParentType) {
      return true;
    }

    Type = Object.getPrototypeOf(Type);
  }

  return false;
}
//# sourceMappingURL=inherits-from.js.map