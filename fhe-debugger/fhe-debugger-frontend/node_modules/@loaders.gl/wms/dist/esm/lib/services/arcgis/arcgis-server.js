export async function getArcGISServices(url) {
  let fetchFile = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : fetch;
  if (url.includes('rest/services')) {
    const serverUrl = url.replace(/rest\/services.*$/i, 'rest/services');
    return loadServiceDirectory(serverUrl, fetchFile, []);
  }
  return null;
}
async function loadServiceDirectory(serverUrl, fetch, path) {
  const serviceUrl = "".concat(serverUrl, "/").concat(path.join('/'));
  const response = await fetch("".concat(serviceUrl, "?f=pjson"));
  const directory = await response.json();
  const services = extractServices(directory, serviceUrl);
  const folders = directory.folders || [];
  const promises = folders.map(folder => loadServiceDirectory("".concat(serverUrl), fetch, [...path, folder]));
  for (const folderServices of await Promise.all(promises)) {
    services.push(...folderServices);
  }
  return services;
}
function extractServices(directory, url) {
  const arcgisServices = directory.services || [];
  const services = [];
  for (const service of arcgisServices) {
    services.push({
      name: service.name,
      type: "arcgis-".concat(service.type.toLocaleLowerCase().replace('server', '-server')),
      url: "".concat(url).concat(service.name, "/").concat(service.type)
    });
  }
  return services;
}
//# sourceMappingURL=arcgis-server.js.map