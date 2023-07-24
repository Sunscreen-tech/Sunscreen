tilebelt
====
[![Build Status](https://travis-ci.org/mapbox/tilebelt.svg?branch=master)](https://travis-ci.org/mapbox/tilebelt) [![Coverage Status](https://coveralls.io/repos/mapbox/tilebelt/badge.svg?branch=use-tap)](https://coveralls.io/r/mapbox/tilebelt?branch=use-tap)

simple [tile](http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames) utilities

## install

```bash
npm install tilebelt
```

## usage

```js
var tilebelt = require('tilebelt');

var tile = [10,15,8] // x,y,z

console.log(tilebelt.tileToGeoJSON(tile));
console.log(tilebelt.getParent(tile));
```

## features

function | description
---|---
tileToGeoJSON(tile) | get a geojson representation of a tile
tileToBBOX(tile) | get the bbox of a tile
bboxToTile(bbox) | get the smallest tile to cover a bbox
getChildren(tile) | get the 4 tiles one zoom level higher
getParent(tile) | get the tile one zoom level lower
getSiblings(tile) | get the 3 sibling tiles for a tile
hasSiblings(tiles, tile) | check to see if an array of tiles contains a tiles siblings
hasTile(tiles, tile) | check to see if an array of tiles contains a particular tile
tilesEqual(tile1, tile2) | check to see if two tiles are the same
tileToQuadkey(tile) | get the quadkey for a tile
quadkeyToTile(quadkey) | get the tile for a quadkey
pointToTile(lon, lat, zoom) | get the tile for a point at a specified zoom level
pointToTileFraction(lon, lat, zoom) | get the precise fractional tile location for a point at a zoom level

## tests

```bash
npm test
```

## benchmarks

```bash
npm run bench
```