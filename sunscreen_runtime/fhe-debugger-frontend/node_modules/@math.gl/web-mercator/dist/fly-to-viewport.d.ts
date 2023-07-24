import type { ViewportProps } from './normalize-viewport-props';
export declare type FlytoTransitionOptions = {
    curve?: number;
    speed?: number;
    screenSpeed?: number;
    maxDuration?: number;
};
/**
 * mapbox-gl-js flyTo : https://www.mapbox.com/mapbox-gl-js/api/#map#flyto.
 * It implements “Smooth and efficient zooming and panning.” algorithm by
 * "Jarke J. van Wijk and Wim A.A. Nuij"
 */
export default function flyToViewport(startProps: ViewportProps, endProps: ViewportProps, t: number, options?: FlytoTransitionOptions): {
    longitude: number;
    latitude: number;
    zoom: number;
};
export declare function getFlyToDuration(startProps: ViewportProps, endProps: ViewportProps, options?: FlytoTransitionOptions): number;
//# sourceMappingURL=fly-to-viewport.d.ts.map