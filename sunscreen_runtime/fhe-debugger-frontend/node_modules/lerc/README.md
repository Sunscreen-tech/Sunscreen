[![npm version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/lerc.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/lerc

# Lerc JS

> Rapid decoding of Lerc compressed raster data for any standard pixel type, not just rgb or byte.

# Breaking changes
- [Web Assembly](https://caniuse.com/wasm) support is now required.
- <code>Lerc.load()</code> must be invoked and the returned promise must be resolved prior to <code>Lerc.decode</code>. This only needs to be done once per worker (or the main thread). There's no extra cost when invoked multiple times as the internal wasm loading promise is cached.

## Get started

```js
npm install lerc

// es module
import * as Lerc from 'lerc';

// commonJS
const Lerc = require('lerc');
```

```js
// use umd via a script tag
<script type="text/javascript" src="https://unpkg.com/lerc@latest/LercDecode.min.js"></script>
```

## Sample usage

```js
await Lerc.load();

const arrayBuffer = await fetch('http://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer/tile/0/0/0')
  .then(response => response.arrayBuffer());
const pixelBlock = Lerc.decode(arrayBuffer);
const { height, width, pixels, mask } = pixelBlock;
for (let i = 0; i < height; i++) {
  for (let j = 0; j < width; j++) {
    if (!mask || mask[i * width + j]) {
      // do something with valid pixel (i,j)
    }
  }
}

// use options
const pixelBlock = Lerc.decode(arrayBuffer, {
  inputOffset: 10, // start from the 10th byte (default is 0)
  returnInterleaved: true // only applicable to n-depth lerc blobs (default is false)
});
```


## API Reference

<a name="module_Lerc"></a>

## Lerc
A module for decoding LERC blobs.

<a name="exp_module_Lerc--load"></a>

### load([options]) ⇒ <code>Promise<void></code> ⏏
Load the dependencies (web assembly). Check whether dependencies has been loaded using <code>Lerc.isLoaded()</code>. The loading promise is cached so it can be invoked multiple times if needed.


**Kind**: Exported function

| Param | Type | Description |
| --- | --- | --- |
| [options.locateFile] | <code>(wasmFileName?: string, scriptDir?: string) => string</code> | The function to locate lerc-wasm.wasm. Used when the web assembly file is moved to a different location. |


<a name="exp_module_Lerc--decode"></a>

### decode(input, [options]) ⇒ <code>Object</code> ⏏
A function for decoding both LERC1 and LERC2 byte streams capable of handling multiband pixel blocks for various pixel types.

**Kind**: Exported function

| Param | Type | Description |
| --- | --- | --- |
| input | <code>ArrayBuffer</code> | The LERC input byte stream |
| [options] | <code>object</code> | The decoding options below are optional. |
| [options.inputOffset] | <code>number</code> | The number of bytes to skip in the input byte stream. A valid Lerc file is expected at that position. |
| [options.noDataValue] | <code>number</code> | It is recommended to use the returned mask instead of setting this value. |
| (Deprecated) [options.returnPixelInterleavedDims] | <code>boolean</code> | will be removed in next release, use returnInterleaved instead. |
| [options.returnInterleaved] | <code>boolean</code> | (ndepth LERC2 only) If true, returned depth values are pixel-interleaved. |

**Result Object Properties**

| Name | Type | Description |
| --- | --- | --- |
| width | <code>number</code> | Width of decoded image. |
| height | <code>number</code> | Height of decoded image. |
| pixels | <code>array</code> | [band1, band2, …] Each band is a typed array of width * height * depthCount. |
| pixelType | <code>string</code> | The type of pixels represented in the output. |
| mask | <code>mask</code> | Typed array with a size of width*height, or null if all pixels are valid. |
| statistics | <code>array</code> | [statistics_band1, statistics_band2, …] Each element is a statistics object representing min and max values |
| (Deprecated) dimCount | <code>number</code> | Will be removed in next release, use <code>depthCount</code> instead.
| depthCount | <code>number</code> | Depth count
| [bandMasks] | <code>array</code> | [band1_mask, band2_mask, …] Each band is a Uint8Array of width * height * depthCount.  |

* * *

## Licensing

Copyright &copy; 2017-2022 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.

A local copy of the license and additional notices are located with the source distribution at:

http://github.com/Esri/lerc/