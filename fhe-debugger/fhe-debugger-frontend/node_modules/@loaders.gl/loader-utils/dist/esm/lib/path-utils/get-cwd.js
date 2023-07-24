export function getCWD() {
  var _window$location;
  if (typeof process !== 'undefined' && typeof process.cwd !== 'undefined') {
    return process.cwd();
  }
  const pathname = (_window$location = window.location) === null || _window$location === void 0 ? void 0 : _window$location.pathname;
  return (pathname === null || pathname === void 0 ? void 0 : pathname.slice(0, pathname.lastIndexOf('/') + 1)) || '';
}
//# sourceMappingURL=get-cwd.js.map