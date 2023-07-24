import { ChildProcessProxy } from '@loaders.gl/worker-utils';
export async function encodeImageURLToCompressedTextureURL(inputUrl, outputUrl, options) {
  const args = ['texture-compressor', '--type', 's3tc', '--compression', 'DXT1', '--quality', 'normal', '--input', inputUrl, '--output', outputUrl];
  const childProcess = new ChildProcessProxy();
  await childProcess.start({
    command: 'npx',
    arguments: args,
    spawn: options
  });
  return outputUrl;
}
//# sourceMappingURL=encode-texture.js.map