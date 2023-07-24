// probe.gl, MIT license

function getStorage(type): Storage {
  try {
    // @ts-expect-error
    const storage: Storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return storage;
  } catch (e) {
    return null;
  }
}

// Store keys in local storage via simple interface
export class LocalStorage<Configuration extends {}> {
  storage: Storage;
  id: string;
  config: Required<Configuration>;

  constructor(id: string, defaultConfig: Required<Configuration>, type = 'sessionStorage') {
    this.storage = getStorage(type);
    this.id = id;
    this.config = defaultConfig;
    this._loadConfiguration();
  }

  getConfiguration(): Required<Configuration> {
    return this.config;
  }

  setConfiguration(configuration: Configuration): void {
    Object.assign(this.config, configuration);
    if (this.storage) {
      const serialized = JSON.stringify(this.config);
      this.storage.setItem(this.id, serialized);
    }
  }

  // Get config from persistent store, if available
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
