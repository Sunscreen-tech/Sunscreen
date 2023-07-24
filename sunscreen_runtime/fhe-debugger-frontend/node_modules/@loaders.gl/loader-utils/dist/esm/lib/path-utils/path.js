import { getCWD } from './get-cwd';
export function filename(url) {
  const slashIndex = url ? url.lastIndexOf('/') : -1;
  return slashIndex >= 0 ? url.substr(slashIndex + 1) : '';
}
export function dirname(url) {
  const slashIndex = url ? url.lastIndexOf('/') : -1;
  return slashIndex >= 0 ? url.substr(0, slashIndex) : '';
}
export function join() {
  for (var _len = arguments.length, parts = new Array(_len), _key = 0; _key < _len; _key++) {
    parts[_key] = arguments[_key];
  }
  const separator = '/';
  parts = parts.map((part, index) => {
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
export function resolve() {
  const paths = [];
  for (let _i = 0; _i < arguments.length; _i++) {
    paths[_i] = _i < 0 || arguments.length <= _i ? undefined : arguments[_i];
  }
  let resolvedPath = '';
  let resolvedAbsolute = false;
  let cwd;
  for (let i = paths.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    let path;
    if (i >= 0) {
      path = paths[i];
    } else {
      if (cwd === undefined) {
        cwd = getCWD();
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
const SLASH = 47;
const DOT = 46;
function normalizeStringPosix(path, allowAboveRoot) {
  let res = '';
  let lastSlash = -1;
  let dots = 0;
  let code;
  let isAboveRoot = false;
  for (let i = 0; i <= path.length; ++i) {
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
            const start = res.length - 1;
            let j = start;
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
        const slice = path.slice(lastSlash + 1, i);
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