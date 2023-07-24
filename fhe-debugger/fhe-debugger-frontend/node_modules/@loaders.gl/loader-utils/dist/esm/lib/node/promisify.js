export function promisify1(fn) {
  return args => new Promise((resolve, reject) => fn(args, (error, callbackArgs) => error ? reject(error) : resolve(callbackArgs)));
}
export function promisify2(fn) {
  return (arg1, arg2) => new Promise((resolve, reject) => fn(arg1, arg2, (error, callbackArgs) => error ? reject(error) : resolve(callbackArgs)));
}
export function promisify3(fn) {
  return (arg1, arg2, arg3) => new Promise((resolve, reject) => fn(arg1, arg2, arg3, (error, callbackArgs) => error ? reject(error) : resolve(callbackArgs)));
}
//# sourceMappingURL=promisify.js.map