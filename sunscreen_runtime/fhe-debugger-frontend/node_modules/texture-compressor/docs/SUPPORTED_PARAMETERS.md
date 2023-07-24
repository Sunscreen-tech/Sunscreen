# Supported parameters

## ASTC

- Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
- Compression tool: ASTCenc (https://github.com/ARM-software/astc-encoder)
- WebGL extension: https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/

Supported input types:

```
  .jpeg
  .jpg
  .png
  .bmp
  .gif
```

Supported compression types:

```
  ASTC_4x4
  ASTC_5x4
  ASTC_5x5
  ASTC_6x5
  ASTC_6x6
  ASTC_8x5
  ASTC_8x6
  ASTC_8x8
  ASTC_10x5
  ASTC_10x6
  ASTC_10x8
  ASTC_10x10
  ASTC_12x10
  ASTC_12x12
  ASTC_3x3x3
  ASTC_4x3x3
  ASTC_4x4x3
  ASTC_4x4x4
  ASTC_5x4x4
  ASTC_5x5x4
  ASTC_5x5x5
  ASTC_6x5x5
  ASTC_6x6x5
  ASTC_6x6x6
```

Supported quality types:

```
  astcveryfast
  astcfast
  astcmedium
  astcthorough
  astcexhaustive
```

## ETC

- Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
- WebGL extension: https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_etc/

Supported input types:

```
  .jpeg
  .jpg
  .png
  .bmp
```

Supported compression types:

```
  ETC1
  ETC2_RGBA
  ETC2_RGB
```

Supported quality types:

```
  etcfast
  etcslow
  etcfastperceptual
  etcslowperceptual
```

## PVRTC

- Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
- WebGL extension: http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_pvrtc/

Supported input types:

```
  .jpeg
  .jpg
  .png
  .bmp
```

Supported compression types:

```
  PVRTC1_2
  PVRTC1_4
  PVRTC1_2_RGB
  PVRTC1_4_RGB
```

Supported quality types:

```
  pvrtcfastest
  pvrtcfast
  pvrtcnormal
  pvrtchigh
  pvrtcbest
```

## S3TC

- Compression tool: Crunch (https://github.com/BinomialLLC/crunch/blob/235946f7a1cf8b9c97e8bf0e8062d5439a51dec7/crunch/crunch.cpp#L70-L181)
- WebGL extension: http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/

Supported input types:

```
  .jpeg
  .jpg
  .png
  .bmp
  .gif
```

Supported compression types:

```
  DXT1
  DXT1A
  DXT3
  DXT5
```

Supported quality types:

```
  superfast
  fast
  normal
  better
  uber
```
