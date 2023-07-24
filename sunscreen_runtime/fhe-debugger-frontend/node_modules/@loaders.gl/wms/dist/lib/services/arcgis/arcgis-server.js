"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArcGISServices = void 0;
/**
 * (Recursively) load the service directory from an ArcGIS Server URL
 * @param url
 * @param fetchFile= Optional fetch function override
 * @returns
 */
async function getArcGISServices(url, fetchFile = fetch) {
    if (url.includes('rest/services')) {
        const serverUrl = url.replace(/rest\/services.*$/i, 'rest/services');
        return loadServiceDirectory(serverUrl, fetchFile, []);
    }
    return null;
}
exports.getArcGISServices = getArcGISServices;
async function loadServiceDirectory(serverUrl, fetch, path) {
    const serviceUrl = `${serverUrl}/${path.join('/')}`;
    const response = await fetch(`${serviceUrl}?f=pjson`);
    const directory = await response.json();
    const services = extractServices(directory, serviceUrl);
    const folders = (directory.folders || []);
    const promises = folders.map((folder) => loadServiceDirectory(`${serverUrl}`, fetch, [...path, folder]));
    for (const folderServices of await Promise.all(promises)) {
        services.push(...folderServices);
    }
    return services;
}
function extractServices(directory, url) {
    const arcgisServices = (directory.services || []);
    const services = [];
    for (const service of arcgisServices) {
        services.push({
            name: service.name,
            type: `arcgis-${service.type.toLocaleLowerCase().replace('server', '-server')}`,
            url: `${url}${service.name}/${service.type}`
        });
    }
    return services;
}
