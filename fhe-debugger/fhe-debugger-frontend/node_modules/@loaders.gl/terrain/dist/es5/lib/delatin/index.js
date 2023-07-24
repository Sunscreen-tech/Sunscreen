"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var Delatin = function () {
  function Delatin(data, width) {
    var height = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : width;
    (0, _classCallCheck2.default)(this, Delatin);
    this.data = data;
    this.width = width;
    this.height = height;
    this.coords = [];
    this.triangles = [];
    this._halfedges = [];
    this._candidates = [];
    this._queueIndices = [];
    this._queue = [];
    this._errors = [];
    this._rms = [];
    this._pending = [];
    this._pendingLen = 0;
    this._rmsSum = 0;
    var x1 = width - 1;
    var y1 = height - 1;
    var p0 = this._addPoint(0, 0);
    var p1 = this._addPoint(x1, 0);
    var p2 = this._addPoint(0, y1);
    var p3 = this._addPoint(x1, y1);
    var t0 = this._addTriangle(p3, p0, p2, -1, -1, -1);
    this._addTriangle(p0, p3, p1, t0, -1, -1);
    this._flush();
  }
  (0, _createClass2.default)(Delatin, [{
    key: "run",
    value: function run() {
      var maxError = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
      while (this.getMaxError() > maxError) {
        this.refine();
      }
    }
  }, {
    key: "refine",
    value: function refine() {
      this._step();
      this._flush();
    }
  }, {
    key: "getMaxError",
    value: function getMaxError() {
      return this._errors[0];
    }
  }, {
    key: "getRMSD",
    value: function getRMSD() {
      return this._rmsSum > 0 ? Math.sqrt(this._rmsSum / (this.width * this.height)) : 0;
    }
  }, {
    key: "heightAt",
    value: function heightAt(x, y) {
      return this.data[this.width * y + x];
    }
  }, {
    key: "_flush",
    value: function _flush() {
      var coords = this.coords;
      for (var i = 0; i < this._pendingLen; i++) {
        var t = this._pending[i];
        var a = 2 * this.triangles[t * 3 + 0];
        var b = 2 * this.triangles[t * 3 + 1];
        var c = 2 * this.triangles[t * 3 + 2];
        this._findCandidate(coords[a], coords[a + 1], coords[b], coords[b + 1], coords[c], coords[c + 1], t);
      }
      this._pendingLen = 0;
    }
  }, {
    key: "_findCandidate",
    value: function _findCandidate(p0x, p0y, p1x, p1y, p2x, p2y, t) {
      var minX = Math.min(p0x, p1x, p2x);
      var minY = Math.min(p0y, p1y, p2y);
      var maxX = Math.max(p0x, p1x, p2x);
      var maxY = Math.max(p0y, p1y, p2y);
      var w00 = orient(p1x, p1y, p2x, p2y, minX, minY);
      var w01 = orient(p2x, p2y, p0x, p0y, minX, minY);
      var w02 = orient(p0x, p0y, p1x, p1y, minX, minY);
      var a01 = p1y - p0y;
      var b01 = p0x - p1x;
      var a12 = p2y - p1y;
      var b12 = p1x - p2x;
      var a20 = p0y - p2y;
      var b20 = p2x - p0x;
      var a = orient(p0x, p0y, p1x, p1y, p2x, p2y);
      var z0 = this.heightAt(p0x, p0y) / a;
      var z1 = this.heightAt(p1x, p1y) / a;
      var z2 = this.heightAt(p2x, p2y) / a;
      var maxError = 0;
      var mx = 0;
      var my = 0;
      var rms = 0;
      for (var y = minY; y <= maxY; y++) {
        var dx = 0;
        if (w00 < 0 && a12 !== 0) {
          dx = Math.max(dx, Math.floor(-w00 / a12));
        }
        if (w01 < 0 && a20 !== 0) {
          dx = Math.max(dx, Math.floor(-w01 / a20));
        }
        if (w02 < 0 && a01 !== 0) {
          dx = Math.max(dx, Math.floor(-w02 / a01));
        }
        var w0 = w00 + a12 * dx;
        var w1 = w01 + a20 * dx;
        var w2 = w02 + a01 * dx;
        var wasInside = false;
        for (var x = minX + dx; x <= maxX; x++) {
          if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
            wasInside = true;
            var z = z0 * w0 + z1 * w1 + z2 * w2;
            var dz = Math.abs(z - this.heightAt(x, y));
            rms += dz * dz;
            if (dz > maxError) {
              maxError = dz;
              mx = x;
              my = y;
            }
          } else if (wasInside) {
            break;
          }
          w0 += a12;
          w1 += a20;
          w2 += a01;
        }
        w00 += b12;
        w01 += b20;
        w02 += b01;
      }
      if (mx === p0x && my === p0y || mx === p1x && my === p1y || mx === p2x && my === p2y) {
        maxError = 0;
      }
      this._candidates[2 * t] = mx;
      this._candidates[2 * t + 1] = my;
      this._rms[t] = rms;
      this._queuePush(t, maxError, rms);
    }
  }, {
    key: "_step",
    value: function _step() {
      var t = this._queuePop();
      var e0 = t * 3 + 0;
      var e1 = t * 3 + 1;
      var e2 = t * 3 + 2;
      var p0 = this.triangles[e0];
      var p1 = this.triangles[e1];
      var p2 = this.triangles[e2];
      var ax = this.coords[2 * p0];
      var ay = this.coords[2 * p0 + 1];
      var bx = this.coords[2 * p1];
      var by = this.coords[2 * p1 + 1];
      var cx = this.coords[2 * p2];
      var cy = this.coords[2 * p2 + 1];
      var px = this._candidates[2 * t];
      var py = this._candidates[2 * t + 1];
      var pn = this._addPoint(px, py);
      if (orient(ax, ay, bx, by, px, py) === 0) {
        this._handleCollinear(pn, e0);
      } else if (orient(bx, by, cx, cy, px, py) === 0) {
        this._handleCollinear(pn, e1);
      } else if (orient(cx, cy, ax, ay, px, py) === 0) {
        this._handleCollinear(pn, e2);
      } else {
        var h0 = this._halfedges[e0];
        var h1 = this._halfedges[e1];
        var h2 = this._halfedges[e2];
        var t0 = this._addTriangle(p0, p1, pn, h0, -1, -1, e0);
        var t1 = this._addTriangle(p1, p2, pn, h1, -1, t0 + 1);
        var t2 = this._addTriangle(p2, p0, pn, h2, t0 + 2, t1 + 1);
        this._legalize(t0);
        this._legalize(t1);
        this._legalize(t2);
      }
    }
  }, {
    key: "_addPoint",
    value: function _addPoint(x, y) {
      var i = this.coords.length >> 1;
      this.coords.push(x, y);
      return i;
    }
  }, {
    key: "_addTriangle",
    value: function _addTriangle(a, b, c, ab, bc, ca) {
      var e = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : this.triangles.length;
      var t = e / 3;
      this.triangles[e + 0] = a;
      this.triangles[e + 1] = b;
      this.triangles[e + 2] = c;
      this._halfedges[e + 0] = ab;
      this._halfedges[e + 1] = bc;
      this._halfedges[e + 2] = ca;
      if (ab >= 0) {
        this._halfedges[ab] = e + 0;
      }
      if (bc >= 0) {
        this._halfedges[bc] = e + 1;
      }
      if (ca >= 0) {
        this._halfedges[ca] = e + 2;
      }
      this._candidates[2 * t + 0] = 0;
      this._candidates[2 * t + 1] = 0;
      this._queueIndices[t] = -1;
      this._rms[t] = 0;
      this._pending[this._pendingLen++] = t;
      return e;
    }
  }, {
    key: "_legalize",
    value: function _legalize(a) {
      var b = this._halfedges[a];
      if (b < 0) {
        return;
      }
      var a0 = a - a % 3;
      var b0 = b - b % 3;
      var al = a0 + (a + 1) % 3;
      var ar = a0 + (a + 2) % 3;
      var bl = b0 + (b + 2) % 3;
      var br = b0 + (b + 1) % 3;
      var p0 = this.triangles[ar];
      var pr = this.triangles[a];
      var pl = this.triangles[al];
      var p1 = this.triangles[bl];
      var coords = this.coords;
      if (!inCircle(coords[2 * p0], coords[2 * p0 + 1], coords[2 * pr], coords[2 * pr + 1], coords[2 * pl], coords[2 * pl + 1], coords[2 * p1], coords[2 * p1 + 1])) {
        return;
      }
      var hal = this._halfedges[al];
      var har = this._halfedges[ar];
      var hbl = this._halfedges[bl];
      var hbr = this._halfedges[br];
      this._queueRemove(a0 / 3);
      this._queueRemove(b0 / 3);
      var t0 = this._addTriangle(p0, p1, pl, -1, hbl, hal, a0);
      var t1 = this._addTriangle(p1, p0, pr, t0, har, hbr, b0);
      this._legalize(t0 + 1);
      this._legalize(t1 + 2);
    }
  }, {
    key: "_handleCollinear",
    value: function _handleCollinear(pn, a) {
      var a0 = a - a % 3;
      var al = a0 + (a + 1) % 3;
      var ar = a0 + (a + 2) % 3;
      var p0 = this.triangles[ar];
      var pr = this.triangles[a];
      var pl = this.triangles[al];
      var hal = this._halfedges[al];
      var har = this._halfedges[ar];
      var b = this._halfedges[a];
      if (b < 0) {
        var _t = this._addTriangle(pn, p0, pr, -1, har, -1, a0);
        var _t2 = this._addTriangle(p0, pn, pl, _t, -1, hal);
        this._legalize(_t + 1);
        this._legalize(_t2 + 2);
        return;
      }
      var b0 = b - b % 3;
      var bl = b0 + (b + 2) % 3;
      var br = b0 + (b + 1) % 3;
      var p1 = this.triangles[bl];
      var hbl = this._halfedges[bl];
      var hbr = this._halfedges[br];
      this._queueRemove(b0 / 3);
      var t0 = this._addTriangle(p0, pr, pn, har, -1, -1, a0);
      var t1 = this._addTriangle(pr, p1, pn, hbr, -1, t0 + 1, b0);
      var t2 = this._addTriangle(p1, pl, pn, hbl, -1, t1 + 1);
      var t3 = this._addTriangle(pl, p0, pn, hal, t0 + 2, t2 + 1);
      this._legalize(t0);
      this._legalize(t1);
      this._legalize(t2);
      this._legalize(t3);
    }
  }, {
    key: "_queuePush",
    value: function _queuePush(t, error, rms) {
      var i = this._queue.length;
      this._queueIndices[t] = i;
      this._queue.push(t);
      this._errors.push(error);
      this._rmsSum += rms;
      this._queueUp(i);
    }
  }, {
    key: "_queuePop",
    value: function _queuePop() {
      var n = this._queue.length - 1;
      this._queueSwap(0, n);
      this._queueDown(0, n);
      return this._queuePopBack();
    }
  }, {
    key: "_queuePopBack",
    value: function _queuePopBack() {
      var t = this._queue.pop();
      this._errors.pop();
      this._rmsSum -= this._rms[t];
      this._queueIndices[t] = -1;
      return t;
    }
  }, {
    key: "_queueRemove",
    value: function _queueRemove(t) {
      var i = this._queueIndices[t];
      if (i < 0) {
        var it = this._pending.indexOf(t);
        if (it !== -1) {
          this._pending[it] = this._pending[--this._pendingLen];
        } else {
          throw new Error('Broken triangulation (something went wrong).');
        }
        return;
      }
      var n = this._queue.length - 1;
      if (n !== i) {
        this._queueSwap(i, n);
        if (!this._queueDown(i, n)) {
          this._queueUp(i);
        }
      }
      this._queuePopBack();
    }
  }, {
    key: "_queueLess",
    value: function _queueLess(i, j) {
      return this._errors[i] > this._errors[j];
    }
  }, {
    key: "_queueSwap",
    value: function _queueSwap(i, j) {
      var pi = this._queue[i];
      var pj = this._queue[j];
      this._queue[i] = pj;
      this._queue[j] = pi;
      this._queueIndices[pi] = j;
      this._queueIndices[pj] = i;
      var e = this._errors[i];
      this._errors[i] = this._errors[j];
      this._errors[j] = e;
    }
  }, {
    key: "_queueUp",
    value: function _queueUp(j0) {
      var j = j0;
      while (true) {
        var i = j - 1 >> 1;
        if (i === j || !this._queueLess(j, i)) {
          break;
        }
        this._queueSwap(i, j);
        j = i;
      }
    }
  }, {
    key: "_queueDown",
    value: function _queueDown(i0, n) {
      var i = i0;
      while (true) {
        var j1 = 2 * i + 1;
        if (j1 >= n || j1 < 0) {
          break;
        }
        var j2 = j1 + 1;
        var j = j1;
        if (j2 < n && this._queueLess(j2, j1)) {
          j = j2;
        }
        if (!this._queueLess(j, i)) {
          break;
        }
        this._queueSwap(i, j);
        i = j;
      }
      return i > i0;
    }
  }]);
  return Delatin;
}();
exports.default = Delatin;
function orient(ax, ay, bx, by, cx, cy) {
  return (bx - cx) * (ay - cy) - (by - cy) * (ax - cx);
}
function inCircle(ax, ay, bx, by, cx, cy, px, py) {
  var dx = ax - px;
  var dy = ay - py;
  var ex = bx - px;
  var ey = by - py;
  var fx = cx - px;
  var fy = cy - py;
  var ap = dx * dx + dy * dy;
  var bp = ex * ex + ey * ey;
  var cp = fx * fx + fy * fy;
  return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
}
//# sourceMappingURL=index.js.map