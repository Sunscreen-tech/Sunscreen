import { loadBasisEncoderModule } from '../parsers/basis-module-loader';
export async function encodeKTX2BasisTexture(image) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const {
    useSRGB = false,
    qualityLevel = 10,
    encodeUASTC = false,
    mipmaps = false
  } = options;
  const {
    BasisEncoder
  } = await loadBasisEncoderModule(options);
  const basisEncoder = new BasisEncoder();
  try {
    const basisFileData = new Uint8Array(image.width * image.height * 4);
    basisEncoder.setCreateKTX2File(true);
    basisEncoder.setKTX2UASTCSupercompression(true);
    basisEncoder.setKTX2SRGBTransferFunc(true);
    basisEncoder.setSliceSourceImage(0, image.data, image.width, image.height, false);
    basisEncoder.setPerceptual(useSRGB);
    basisEncoder.setMipSRGB(useSRGB);
    basisEncoder.setQualityLevel(qualityLevel);
    basisEncoder.setUASTC(encodeUASTC);
    basisEncoder.setMipGen(mipmaps);
    const numOutputBytes = basisEncoder.encode(basisFileData);
    const actualKTX2FileData = basisFileData.subarray(0, numOutputBytes).buffer;
    return actualKTX2FileData;
  } catch (error) {
    console.error('Basis Universal Supercompressed GPU Texture encoder Error: ', error);
    throw error;
  } finally {
    basisEncoder.delete();
  }
}
//# sourceMappingURL=encode-ktx2-basis-texture.js.map