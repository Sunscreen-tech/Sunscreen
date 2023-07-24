"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeImageURLToCompressedTextureURL = void 0;
const worker_utils_1 = require("@loaders.gl/worker-utils");
/*
 * @see https://github.com/TimvanScherpenzeel/texture-compressor
 */
async function encodeImageURLToCompressedTextureURL(inputUrl, outputUrl, options) {
    // prettier-ignore
    const args = [
        // Note: our actual executable is `npx`, so `texture-compressor` is an argument
        'texture-compressor',
        '--type', 's3tc',
        '--compression', 'DXT1',
        '--quality', 'normal',
        '--input', inputUrl,
        '--output', outputUrl
    ];
    const childProcess = new worker_utils_1.ChildProcessProxy();
    await childProcess.start({
        command: 'npx',
        arguments: args,
        spawn: options
    });
    return outputUrl;
}
exports.encodeImageURLToCompressedTextureURL = encodeImageURLToCompressedTextureURL;
