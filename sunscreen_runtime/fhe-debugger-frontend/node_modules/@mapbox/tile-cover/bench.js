var Benchmark = require('benchmark');
var cover = require('./index.js').tiles;
var fs = require('fs');

var building = JSON.parse(fs.readFileSync('./test/fixtures/building.geojson'));
var line = JSON.parse(fs.readFileSync('./test/fixtures/road.geojson'));
var point = JSON.parse(fs.readFileSync('./test/fixtures/point.geojson'));
var russia = JSON.parse(fs.readFileSync('./test/fixtures/russia.geojson'));
var russiaLine = {type: 'LineString', coordinates: russia.coordinates[0]};
var zooms = [6,8,10,12,18,20,25,28];

var suite = new Benchmark.Suite('tile-cover',{
    onError: function(err) {
        console.log(err);
    }
});

addBench(suite, point, 'point', zooms[0], zooms[0]);

zooms.forEach(function(zoom){
    addBench(suite, line, 'road', zoom, zoom);
});
zooms.forEach(function(zoom){
    addBench(suite, building, 'building', zoom, zoom);
});
zooms.slice(0, 3).forEach(function(zoom){
    addBench(suite, russia, 'russia polygon', zoom, zoom);
});
zooms.slice(0, 3).forEach(function(zoom){
    addBench(suite, russiaLine, 'russia polyline', zoom, zoom);
});

addBench(suite, russia, 'russia polygon multizoom', 0, 9);

suite.on('cycle', function(event) {
    console.log(String(event.target));
}).run();

function addBench(suite, geometry, name, min_zoom, max_zoom) {
    suite.add('scan '+name+' - z'+min_zoom+' - z'+max_zoom, {
    fn: function() {
            cover(geometry, {min_zoom: min_zoom, max_zoom: max_zoom});
        },
    maxTime: 1
    });
}
