import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
export default class LRUCache {
  constructor(limit = 5) {
    _defineProperty(this, "limit", void 0);

    _defineProperty(this, "_cache", {});

    _defineProperty(this, "_order", []);

    this.limit = limit;
  }

  get(key) {
    const value = this._cache[key];

    if (value) {
      this._deleteOrder(key);

      this._appendOrder(key);
    }

    return value;
  }

  set(key, value) {
    if (!this._cache[key]) {
      if (Object.keys(this._cache).length === this.limit) {
        this.delete(this._order[0]);
      }

      this._cache[key] = value;

      this._appendOrder(key);
    } else {
      this.delete(key);
      this._cache[key] = value;

      this._appendOrder(key);
    }
  }

  delete(key) {
    const value = this._cache[key];

    if (value) {
      delete this._cache[key];

      this._deleteOrder(key);
    }
  }

  _deleteOrder(key) {
    const index = this._order.indexOf(key);

    if (index >= 0) {
      this._order.splice(index, 1);
    }
  }

  _appendOrder(key) {
    this._order.push(key);
  }

}
//# sourceMappingURL=lru-cache.js.map