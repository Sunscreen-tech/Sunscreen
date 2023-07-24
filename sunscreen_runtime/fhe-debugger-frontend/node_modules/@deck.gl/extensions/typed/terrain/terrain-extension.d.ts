import { LayerExtension, UpdateParameters } from '@deck.gl/core/typed';
import type { Layer } from '@deck.gl/core/typed';
export declare type TerrainExtensionProps = {
    /**
     * controls whether an object is drawn over the terrain surface by its anchor (usually defined by an accessor called `getPosition`, e.g. icon, scatterplot) or by its geometry (e.g. path, polygon).
     * If not specified, it is automatically deduced from the layer.
     */
    terrainDrawMode?: 'offset' | 'drape';
};
/** Allows layers to show/hide objects by a geofence. */
export default class TerrainExtension extends LayerExtension {
    static defaultProps: {
        terrainDrawMode: undefined;
    };
    static extensionName: string;
    getShaders(this: Layer<TerrainExtensionProps>): any;
    initializeState(this: Layer<TerrainExtensionProps>): void;
    updateState(this: Layer<TerrainExtensionProps>, params: UpdateParameters<Layer<TerrainExtensionProps>>): void;
    onNeedsRedraw(this: Layer<{}>): void;
}
//# sourceMappingURL=terrain-extension.d.ts.map