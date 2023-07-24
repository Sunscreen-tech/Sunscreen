import { MeshAttribute } from '@loaders.gl/schema';
import { Schema } from '@loaders.gl/schema';
import type { DracoLoaderData } from '../draco-types';
/** Extract an arrow-like schema from a Draco mesh */
export declare function getDracoSchema(attributes: {
    [attributeName: string]: MeshAttribute;
}, loaderData: DracoLoaderData, indices?: MeshAttribute): Schema;
//# sourceMappingURL=get-draco-schema.d.ts.map