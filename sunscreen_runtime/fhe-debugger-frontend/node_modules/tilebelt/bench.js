var Benchmark = require('benchmark');
var tilebelt = require('./');

var tile1 = [5,10,10];
var tile2 = [558004,363898,20];
var quadkey1 = tilebelt.tileToQuadkey(tile1);
var quadkey2 = tilebelt.tileToQuadkey(tile2);
var bbox1 = tilebelt.tileToBBOX(tile1);
var bbox2 = tilebelt.tileToBBOX(tile2);

new Benchmark.Suite()
.add('tileToGeoJSON#tile1', function () {
    tilebelt.tileToGeoJSON(tile1);
})
.add('tileToGeoJSON#tile2', function () {
    tilebelt.tileToGeoJSON(tile2);
})
.add('tileToBBOX#tile1', function () {
    tilebelt.tileToBBOX(tile1);
})
.add('tileToBBOX#tile2', function () {
    tilebelt.tileToBBOX(tile2);
})
.add('getParent#tile1', function () {
    tilebelt.getParent(tile1);
})
.add('getParent#tile2', function () {
    tilebelt.getParent(tile2);
})
.add('getSiblings#tile1', function () {
    tilebelt.getSiblings(tile1);
})
.add('getSiblings#tile2', function () {
    tilebelt.getSiblings(tile2);
})
.add('tileToQuadkey#tile1', function () {
    tilebelt.tileToQuadkey(tile1);
})
.add('tileToQuadkey#tile2', function () {
    tilebelt.tileToQuadkey(tile2);
})
.add('pointToTile#z10', function () {
    tilebelt.pointToTile(0,0,10);
})
.add('pointToTile#z20', function () {
    tilebelt.pointToTile(1,1,20);
})
.add('quadkeyToTile#quadkey1', function () {
    tilebelt.quadkeyToTile(quadkey1);
})
.add('quadkeyToTile#quadkey2', function () {
    tilebelt.quadkeyToTile(quadkey2);
})
.add('bboxToTile#bbox1', function () {
    tilebelt.bboxToTile(bbox1);
})
.add('bboxToTile#bbox2', function () {
    tilebelt.bboxToTile(bbox2);
})
.add('pointToTileFraction#tile1', function () {
    tilebelt.pointToTileFraction(30.5, 50.5, 15);
})
.add('pointToTileFraction#tile2', function () {
    tilebelt.pointToTileFraction(558004.8, 363898.8, 20);
})
.on('error', function(event) {
    console.log(event.target.error);
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.run();
