/**
 * https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_texture_transform/README.md
 */
import type { GLTFWithBuffers } from '../types/gltf-types';
import type { GLTFLoaderOptions } from '../../gltf-loader';
export declare const name = "KHR_texture_transform";
/**
 * The extension entry to process the transformation
 * @param gltfData gltf buffers and json
 * @param options GLTFLoader options
 */
export declare function decode(gltfData: GLTFWithBuffers, options: GLTFLoaderOptions): Promise<void>;
//# sourceMappingURL=KHR_texture_transform.d.ts.map