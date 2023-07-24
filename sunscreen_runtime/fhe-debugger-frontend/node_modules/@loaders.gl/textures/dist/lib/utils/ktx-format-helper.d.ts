/**
 * Returns WebGl format based on Vulkan format
 * Vulkan to WebGl format mapping provided here http://github.khronos.org/KTX-Specification/#formatMapping
 * Vulkan name to format number mapping provided here: https://www.khronos.org/registry/vulkan/specs/1.2-extensions/man/html/VkFormat.html
 * @param vkFormat
 * @returns WebGL / OpenGL constant
 */
export declare function mapVkFormatToWebGL(vkFormat: number): number;
//# sourceMappingURL=ktx-format-helper.d.ts.map