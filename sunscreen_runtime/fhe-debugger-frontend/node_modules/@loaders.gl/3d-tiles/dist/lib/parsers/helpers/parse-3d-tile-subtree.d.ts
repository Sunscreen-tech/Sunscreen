import type { Subtree } from '../../../types';
import type { LoaderContext, LoaderOptions } from '@loaders.gl/loader-utils';
/**
 * Parse subtree file
 * Spec - https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_implicit_tiling#subtree-file-format
 * @param data
 * @returns
 */
export default function parse3DTilesSubtree(data: ArrayBuffer, options: LoaderOptions | undefined, context: LoaderContext | undefined): Promise<Subtree>;
//# sourceMappingURL=parse-3d-tile-subtree.d.ts.map