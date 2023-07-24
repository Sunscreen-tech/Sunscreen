"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dirname = dirname;
exports.filename = filename;
exports.join = join;
exports.resolve = resolve;
var _getCwd = require("./get-cwd");
function filename(url) {
  var slashIndex = url ? url.lastIndexOf('/') : -1;
  return slashIndex >= 0 ? url.substr(slashIndex + 1) : '';
}
function dirname(url) {
  var slashIndex = url ? url.lastIndexOf('/') : -1;
  return slashIndex >= 0 ? url.substr(0, slashIndex) : '';
}
function join() {
  for (var _len = arguments.length, parts = new Array(_len), _key = 0; _key < _len; _key++) {
    parts[_key] = arguments[_key];
  }
  var separator = '/';
  parts = parts.map(function (part, index) {
    if (index) {
      part = part.replace(new RegExp("^".concat(separator)), '');
    }
    if (index !== parts.length - 1) {
      part = part.replace(new RegExp("".concat(separator, "$")), '');
    }
    return part;
  });
  return parts.join(separator);
}
function resolve() {
  var paths = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    paths[_i] = _i < 0 || arguments.length <= _i ? undefined : arguments[_i];
  }
  var resolvedPath = '';
  var resolvedAbsolute = false;
  var cwd;
  for (var i = paths.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = void 0;
    if (i >= 0) {
      path = paths[i];
    } else {
      if (cwd === undefined) {
        cwd = (0, _getCwd.getCWD)();
      }
      path = cwd;
    }
    if (path.length === 0) {
      continue;
    }
    resolvedPath = "".concat(path, "/").concat(resolvedPath);
    resolvedAbsolute = path.charCodeAt(0) === SLASH;
  }
  resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute) {
    return "/".concat(resolvedPath);
  } else if (resolvedPath.length > 0) {
    return resolvedPath;
  }
  return '.';
}
var SLASH = 47;
var DOT = 46;
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSlash = -1;
  var dots = 0;
  var code;
  var isAboveRoot = false;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      code = path.charCodeAt(i);
    } else if (code === SLASH) {
      break;
    } else {
      code = SLASH;
    }
    if (code === SLASH) {
      if (lastSlash === i - 1 || dots === 1) {} else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || !isAboveRoot || res.charCodeAt(res.length - 1) !== DOT || res.charCodeAt(res.length - 2) !== DOT) {
          if (res.length > 2) {
            var start = res.length - 1;
            var j = start;
            for (; j >= 0; --j) {
              if (res.charCodeAt(j) === SLASH) {
                break;
              }
            }
            if (j !== start) {
              res = j === -1 ? '' : res.slice(0, j);
              lastSlash = i;
              dots = 0;
              isAboveRoot = false;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSlash = i;
            dots = 0;
            isAboveRoot = false;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) {
            res += '/..';
          } else {
            res = '..';
          }
          isAboveRoot = true;
        }
      } else {
        var slice = path.slice(lastSlash + 1, i);
        if (res.length > 0) {
          res += "/".concat(slice);
        } else {
          res = slice;
        }
        isAboveRoot = false;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
//# sourceMappingURL=path.js.map