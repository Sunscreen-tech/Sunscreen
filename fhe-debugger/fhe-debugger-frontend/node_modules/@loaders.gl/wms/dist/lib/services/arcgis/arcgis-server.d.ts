export type Service = {
    name: string;
    type: string;
    url: string;
};
type FetchLike = typeof fetch;
/**
 * (Recursively) load the service directory from an ArcGIS Server URL
 * @param url
 * @param fetchFile= Optional fetch function override
 * @returns
 */
export declare function getArcGISServices(url: string, fetchFile?: FetchLike): Promise<Service[] | null>;
export {};
//# sourceMappingURL=arcgis-server.d.ts.map