const WEBP_TEST_IMAGES = {
  lossy: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
  lossless: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
  alpha: 'UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==',
  animation: 'UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA'
};
const WEBP_FEATURES = ['lossy', 'lossless', 'alpha', 'animation'];
export async function isWebPSupported() {
  let features = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : WEBP_FEATURES;
  const promises = features.map(feature => checkWebPFeature(feature));
  const statuses = await Promise.all(promises);
  return statuses.every(_ => _);
}
async function checkWebPFeature(feature) {
  if (typeof Image === 'undefined') {
    return false;
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = "data:image/webp;base64,".concat(WEBP_TEST_IMAGES[feature]);
  });
}
//# sourceMappingURL=webp.js.map