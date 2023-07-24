import { Layer, Viewport, _LayersPass as LayersPass, LayersPassRenderOptions } from '@deck.gl/core/typed';
import type { HeightMapBuilder } from './height-map-builder';
import type { TerrainCover } from './terrain-cover';
export declare type TerrainPassRenderOptions = LayersPassRenderOptions;
/** Renders textures used by the TerrainEffect render pass */
export declare class TerrainPass extends LayersPass {
    getRenderableLayers(viewport: Viewport, opts: TerrainPassRenderOptions): Layer[];
    renderHeightMap(heightMap: HeightMapBuilder, opts: Partial<TerrainPassRenderOptions>): void;
    renderTerrainCover(terrainCover: TerrainCover, opts: Partial<TerrainPassRenderOptions>): void;
}
//# sourceMappingURL=terrain-pass.d.ts.map