// Do not name these variables the same as the global objects - will break bundling
const global_ = globalThis;
// eslint-disable-next-line consistent-this
const self_ = globalThis.self || globalThis.window || globalThis.global;
const window_ = (globalThis.window || globalThis.self || globalThis.global) as unknown as Window;
const document_ = globalThis.document || ({} as Document);
const process_ = globalThis.process || {};
const console_ = globalThis.console;
const navigator_ = globalThis.navigator || ({} as Navigator);

export {
  global_ as global,
  self_ as self,
  window_ as window,
  document_ as document,
  process_ as process,
  console_ as console,
  navigator_ as navigator
};
