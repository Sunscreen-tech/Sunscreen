import Module from 'module';
import path from 'path';
export async function requireFromFile(filename) {
  if (filename.startsWith('http')) {
    const response = await fetch(filename);
    const code = await response.text();
    return requireFromString(code);
  }
  if (!filename.startsWith('/')) {
    filename = "".concat(process.cwd(), "/").concat(filename);
  }
  return require(filename);
}
export function requireFromString(code) {
  var _options, _options2;
  let filename = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  let options = arguments.length > 2 ? arguments[2] : undefined;
  if (typeof filename === 'object') {
    options = filename;
    filename = '';
  }
  if (typeof code !== 'string') {
    throw new Error("code must be a string, not ".concat(typeof code));
  }
  const paths = Module._nodeModulePaths(path.dirname(filename));
  const parent = module.parent;
  const newModule = new Module(filename, parent);
  newModule.filename = filename;
  newModule.paths = [].concat(((_options = options) === null || _options === void 0 ? void 0 : _options.prependPaths) || []).concat(paths).concat(((_options2 = options) === null || _options2 === void 0 ? void 0 : _options2.appendPaths) || []);
  newModule._compile(code, filename);
  if (parent && parent.children) {
    parent.children.splice(parent.children.indexOf(newModule), 1);
  }
  return newModule.exports;
}
//# sourceMappingURL=require-utils.node.js.map