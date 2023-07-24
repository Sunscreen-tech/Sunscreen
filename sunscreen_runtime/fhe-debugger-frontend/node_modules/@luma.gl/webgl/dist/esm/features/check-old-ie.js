export default function isOldIE() {
  let opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const navigator = typeof window !== 'undefined' && window.navigator || {};
  const userAgent = opts.userAgent || navigator.userAgent || '';
  const isMSIE = userAgent.indexOf('MSIE ') !== -1;
  const isTrident = userAgent.indexOf('Trident/') !== -1;
  return isMSIE || isTrident;
}
//# sourceMappingURL=check-old-ie.js.map