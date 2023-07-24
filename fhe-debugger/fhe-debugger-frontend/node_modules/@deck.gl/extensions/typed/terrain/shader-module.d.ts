import type { _ShaderModule as ShaderModule } from '@deck.gl/core/typed';
import type { Texture2D } from '@luma.gl/core';
import type { Bounds } from '../utils/projection-utils';
import type { TerrainCover } from './terrain-cover';
/** Module parameters expected by the terrain shader module */
export declare type TerrainModuleSettings = {
    pickingActive?: boolean;
    heightMap: Texture2D | null;
    heightMapBounds?: Bounds | null;
    dummyHeightMap: Texture2D;
    terrainCover?: TerrainCover | null;
    drawToTerrainHeightMap?: boolean;
    useTerrainHeightMap?: boolean;
    terrainSkipRender?: boolean;
};
/** A model can have one of the following modes */
export declare const TERRAIN_MODE: {
    NONE: number;
    /** A terrain layer rendering encoded ground elevation into the height map */
    WRITE_HEIGHT_MAP: number;
    /** An offset layer reading encoded ground elevation from the height map */
    USE_HEIGHT_MAP: number;
    /** A terrain layer rendering to screen, using the cover fbo overlaid with its own texture */
    USE_COVER: number;
    /** A terrain layer rendering to screen, using the cover fbo as texture */
    USE_COVER_ONLY: number;
    /** Draped layer is rendered into a texture, and never to screen */
    SKIP: number;
};
export declare const terrainModule: ShaderModule<TerrainModuleSettings>;
//# sourceMappingURL=shader-module.d.ts.map