import type { ImageLoaderOptions } from '../../image-loader';
/**
 * Asynchronously parses an array buffer into an ImageBitmap - this contains the decoded data
 * ImageBitmaps are supported on worker threads, but not supported on Edge, IE11 and Safari
 * https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap#Browser_compatibility
 *
 * TODO - createImageBitmap supports source rect (5 param overload), pass through?
 */
export default function parseToImageBitmap(arrayBuffer: ArrayBuffer, options: ImageLoaderOptions, url?: string): Promise<ImageBitmap>;
//# sourceMappingURL=parse-to-image-bitmap.d.ts.map