const ERR_NOT_OBJECT = 'count(): argument not an object';
const ERR_NOT_CONTAINER = 'count(): argument not a container';
export function count(container) {
  if (!isObject(container)) {
    throw new Error(ERR_NOT_OBJECT);
  }

  if (typeof container.count === 'function') {
    return container.count();
  }

  if (Number.isFinite(container.size)) {
    return container.size;
  }

  if (Number.isFinite(container.length)) {
    return container.length;
  }

  if (isPlainObject(container)) {
    return Object.keys(container).length;
  }

  throw new Error(ERR_NOT_CONTAINER);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && value.constructor === Object;
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}
//# sourceMappingURL=count.js.map