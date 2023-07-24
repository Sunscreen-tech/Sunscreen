import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { I3SPendingTilesRegister } from './i3s-pending-tiles-register';
const STATUS = {
  REQUESTED: 'REQUESTED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};
export class I3STileManager {
  constructor() {
    _defineProperty(this, "_statusMap", void 0);
    _defineProperty(this, "pendingTilesRegister", new I3SPendingTilesRegister());
    this._statusMap = {};
  }
  add(request, key, callback, frameState) {
    if (!this._statusMap[key]) {
      const {
        frameNumber,
        viewport: {
          id
        }
      } = frameState;
      this._statusMap[key] = {
        request,
        callback,
        key,
        frameState,
        status: STATUS.REQUESTED
      };
      this.pendingTilesRegister.register(id, frameNumber);
      request().then(data => {
        this._statusMap[key].status = STATUS.COMPLETED;
        const {
          frameNumber: actualFrameNumber,
          viewport: {
            id
          }
        } = this._statusMap[key].frameState;
        this.pendingTilesRegister.deregister(id, actualFrameNumber);
        this._statusMap[key].callback(data, frameState);
      }).catch(error => {
        this._statusMap[key].status = STATUS.ERROR;
        const {
          frameNumber: actualFrameNumber,
          viewport: {
            id
          }
        } = this._statusMap[key].frameState;
        this.pendingTilesRegister.deregister(id, actualFrameNumber);
        callback(error);
      });
    }
  }
  update(key, frameState) {
    if (this._statusMap[key]) {
      const {
        frameNumber,
        viewport: {
          id
        }
      } = this._statusMap[key].frameState;
      this.pendingTilesRegister.deregister(id, frameNumber);
      const {
        frameNumber: newFrameNumber,
        viewport: {
          id: newViewportId
        }
      } = frameState;
      this.pendingTilesRegister.register(newViewportId, newFrameNumber);
      this._statusMap[key].frameState = frameState;
    }
  }
  find(key) {
    return this._statusMap[key];
  }
  hasPendingTiles(viewportId, frameNumber) {
    return !this.pendingTilesRegister.isZero(viewportId, frameNumber);
  }
}
//# sourceMappingURL=i3s-tile-manager.js.map