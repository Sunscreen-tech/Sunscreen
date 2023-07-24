import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";

function getStorage(type) {
  try {
    const storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return storage;
  } catch (e) {
    return null;
  }
}

export class LocalStorage {
  constructor(id, defaultConfig) {
    let type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'sessionStorage';

    _defineProperty(this, "storage", void 0);

    _defineProperty(this, "id", void 0);

    _defineProperty(this, "config", void 0);

    this.storage = getStorage(type);
    this.id = id;
    this.config = defaultConfig;

    this._loadConfiguration();
  }

  getConfiguration() {
    return this.config;
  }

  setConfiguration(configuration) {
    Object.assign(this.config, configuration);

    if (this.storage) {
      const serialized = JSON.stringify(this.config);
      this.storage.setItem(this.id, serialized);
    }
  }

  _loadConfiguration() {
    let configuration = {};

    if (this.storage) {
      const serializedConfiguration = this.storage.getItem(this.id);
      configuration = serializedConfiguration ? JSON.parse(serializedConfiguration) : {};
    }

    Object.assign(this.config, configuration);
    return this;
  }

}
//# sourceMappingURL=local-storage.js.map