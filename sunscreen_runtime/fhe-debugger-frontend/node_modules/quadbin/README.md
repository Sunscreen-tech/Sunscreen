# quadbin-js

The `quadbin-js` is a TypeScript library for working with the [Quadbin](https://docs.carto.com/analytics-toolbox-bigquery/overview/spatial-indexes/) spatial index.

# Install

```sh
npm install quadbin
```

# Usage

```javascript
import {cellToParent, getResolution, hexToBigInt} from 'quadbin';

cellToParent(5210915457518796799n) // => 5206425052030959615n
getResolution(hexToBigInt('4830ffffffffffff')) // => 3
```

# I/O types

A Quadbin index is a 64-bit integer. This library uses [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) as a data type to represent quadbin indices, both as parameters and return values for functions.

When working with quadbin indices in other contexts (e.g. passing as a parameter in a URL or serializing as JSON), it is more appropriate to encode the index as a hexidecimal string. The library provides the `bigIntToHex()` & `hexToBigInt()` to facilitate this conversion.

# API

## bigIntToHex

```javascript
function bigIntToHex(index: bigint): string
```

Encodes an index into a string, suitable for use in JSON.

## hexToBigInt

```javascript
function hexToBigInt(hex: string): bigint
```

Decodes an string into an index. Inverse of `bigIntToHex()`.

## getResolution

```javascript
function getResolution(quadbin: bigint): bigint 
```

Calculates the resolution of a quadbin cell.

## function cellToParent

```javascript
function cellToParent(quadbin: bigint): bigint 
```

Calculates the parent cell.

## tileToCell

```javascript
function tileToCell(tile: {x: number, y: number, z: number}): bigint
```

Converts a xyz tile into a quadbin cell.

## cellToTile

```javascript
function cellToTile(quadbin: bigint): Tile 
```

Converts quadbin cell into a xyz tile.

## geometryToCells

```javascript
function geometryToCells(geometry: GeoJSONGeometry, resolution: bigint): bigint 
```

Returns a list of cells covering a GeoJSON geometry at a given resolution
