///////////////////////////////////////////////////
// Common.
///////////////////////////////////////////////////

// Injected at compile time, from $npm_package_version.
declare const PACKAGE_VERSION: string;

export const KTX_WRITER = `KTX-Parse v${PACKAGE_VERSION}`;

export const NUL = new Uint8Array([0x00]);


///////////////////////////////////////////////////
// KTX2 Header.
///////////////////////////////////////////////////

export const KTX2_ID = [
	// '´', 'K', 'T', 'X', '2', '0', 'ª', '\r', '\n', '\x1A', '\n'
	0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A
];

export const HEADER_BYTE_LENGTH = 68; // 13 * 4 + 2 * 8

export enum KTX2SupercompressionScheme {
	NONE = 0,
	BASISLZ = 1,
	ZSTD = 2,
	ZLIB = 3,
};


///////////////////////////////////////////////////
// Data Format Descriptor (DFD).
///////////////////////////////////////////////////

export enum KTX2DataFormatType {
    BASICFORMAT = 0x00,
};

export const KHR_DF_VENDORID_KHRONOS = 0;

export const KHR_DF_VERSION = 2;

export const KHR_DF_BLOCKSIZE = 40;

export const VK_FORMAT_UNDEFINED = 0;

export enum KTX2DataFormatModel {
    UNSPECIFIED = 0,
	ETC1S = 163,
	UASTC = 166,
};

export enum KTX2DataFormatPrimaries {
    UNSPECIFIED = 0,
    SRGB = 1,
};

export enum KTX2DataFormatTransfer {
    UNSPECIFIED = 0,
    LINEAR = 1,
    SRGB = 2,
    ITU = 3,
    NTSC = 4,
    SLOG = 5,
    SLOG2 = 6,
};

export enum KTX2DataFormatFlags {
    ALPHA_STRAIGHT = 0,
    ALPHA_PREMULTIPLIED = 1,
};

export enum KTX2DataFormatChannelETC1S {
    RGB = 0,
    RRR = 3,
    GGG = 4,
    AAA = 15,
};

export enum KTX2DataFormatChannelUASTC {
    RGB = 0,
    RGBA = 3,
    RRR = 4,
    RRRG = 5,
};
