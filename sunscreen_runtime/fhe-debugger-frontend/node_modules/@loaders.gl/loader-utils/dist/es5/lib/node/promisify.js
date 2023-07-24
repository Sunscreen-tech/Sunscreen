"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.promisify1 = promisify1;
exports.promisify2 = promisify2;
exports.promisify3 = promisify3;
function promisify1(fn) {
  return function (args) {
    return new Promise(function (resolve, reject) {
      return fn(args, function (error, callbackArgs) {
        return error ? reject(error) : resolve(callbackArgs);
      });
    });
  };
}
function promisify2(fn) {
  return function (arg1, arg2) {
    return new Promise(function (resolve, reject) {
      return fn(arg1, arg2, function (error, callbackArgs) {
        return error ? reject(error) : resolve(callbackArgs);
      });
    });
  };
}
function promisify3(fn) {
  return function (arg1, arg2, arg3) {
    return new Promise(function (resolve, reject) {
      return fn(arg1, arg2, arg3, function (error, callbackArgs) {
        return error ? reject(error) : resolve(callbackArgs);
      });
    });
  };
}
//# sourceMappingURL=promisify.js.map