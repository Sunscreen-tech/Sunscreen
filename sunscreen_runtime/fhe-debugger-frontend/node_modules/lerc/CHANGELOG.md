# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][HEAD]

Now uses web assembly, as a result:
* The existing Javascript decoder ```js/LercDecode.js``` is deprecated. It will be removed in next major release.
* [Web Assembly](https://caniuse.com/wasm) support is now required. IE11 is therefore no longer supported.
* ```Lerc.load()``` must be invoked and the returned promise must be resolved prior to ```Lerc.decode```. This only needs to be done once per worker (or the main thread). There's no extra cost when invoked multiple times as the internal wasm loading promise is cached.
* Updated build script ```npm run build```. A dev build result (unminified UMD bundle) is included in the ```js/dist``` folder for convenience.
* Both UMD and ES modules are included in dist, along with a typing file.
* Deprecated ```decodeResult.dimCount, decodeOptions.returnPixelInterleavedDims```, prefer to use ```depthCount, returnInterleaved```
which is in line with C API concept.

## [3.0.0] - 2021-07-30

The decoder is in sync with ArcMap 10.8.1 and ArcGIS Pro 2.8. LERC encoded binary blobs from any previous version of ArcMap or ArcGIS Pro can also be read / decoded.

### Added
* Added an option to return decoded n-dim blob using pixel-interleaved layout

### Changed
* Upgrade Lerc codec to new version Lerc 2.5.

## [2.0.0] - 2018-11-06

The decoder is in sync with ArcMap 10.7 and ArcGIS Pro 2.3. LERC encoded binary blobs from any previous version of ArcMap or ArcGIS Pro can also be read / decoded.

### Added
* Extend from one value per pixel to nDim values per pixel.

### Changed
* Upgrade Lerc codec to new version Lerc 2.4.

## 1.0.1 - 2017-02-18

### Fixed

* resolved a Huffman code table parsing issue [#31](https://github.com/Esri/lerc/pull/31)

## 1.0 - 2016-11-30

This LERC API JavaScript decoder is in sync with ArcMap 10.5 and ArcGIS Pro 1.4. LERC encoded binary blobs from any previous version of ArcMap or ArcGIS Pro can be read / decoded as well.

### What will trigger a major version change

- A change to this LERC API that is not backwards compatible and requires users to update / change their code in order to use an upgraded .dll or .so file.
- A change to the LERC bitstream that is not backwards compatible and requires users to upgrade their LERC encoder and / or decoder.

[2.0.0]: https://github.com/Esri/lerc/compare/v1.0.1...v2.0 "v2.0"
[HEAD]: https://github.com/Esri/lerc/compare/v2.0...HEAD "Unreleased Changes"
