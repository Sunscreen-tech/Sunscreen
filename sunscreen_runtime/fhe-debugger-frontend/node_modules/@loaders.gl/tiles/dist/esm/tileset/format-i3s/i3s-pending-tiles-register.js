import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
export class I3SPendingTilesRegister {
  constructor() {
    _defineProperty(this, "frameNumberMap", new Map());
  }
  register(viewportId, frameNumber) {
    const viewportMap = this.frameNumberMap.get(viewportId) || new Map();
    const oldCount = viewportMap.get(frameNumber) || 0;
    viewportMap.set(frameNumber, oldCount + 1);
    this.frameNumberMap.set(viewportId, viewportMap);
  }
  deregister(viewportId, frameNumber) {
    const viewportMap = this.frameNumberMap.get(viewportId);
    if (!viewportMap) {
      return;
    }
    const oldCount = viewportMap.get(frameNumber) || 1;
    viewportMap.set(frameNumber, oldCount - 1);
  }
  isZero(viewportId, frameNumber) {
    var _this$frameNumberMap$;
    const count = ((_this$frameNumberMap$ = this.frameNumberMap.get(viewportId)) === null || _this$frameNumberMap$ === void 0 ? void 0 : _this$frameNumberMap$.get(frameNumber)) || 0;
    return count === 0;
  }
}
//# sourceMappingURL=i3s-pending-tiles-register.js.map