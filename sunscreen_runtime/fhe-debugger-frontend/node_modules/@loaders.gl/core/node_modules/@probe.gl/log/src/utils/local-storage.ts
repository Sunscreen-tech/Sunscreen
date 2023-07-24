// probe.gl, MIT license

export type StorageType = 'sessionStorage' | 'localStorage';

function getStorage(type: StorageType): Storage | null {
  try {
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
  storage: Storage | null;
  id: string;
  config: Required<Configuration>;

  constructor(
    id: string,
    defaultConfig: Required<Configuration>,
    type: StorageType = 'sessionStorage'
  ) {
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
