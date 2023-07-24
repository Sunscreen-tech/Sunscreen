// a tile is an array [x,y,z]
var d2r = Math.PI / 180,
    r2d = 180 / Math.PI;

function tileToBBOX (tile) {
    var e = tile2lon(tile[0]+1,tile[2]);
    var w = tile2lon(tile[0],tile[2]);
    var s = tile2lat(tile[1]+1,tile[2]);
    var n = tile2lat(tile[1],tile[2]);
    return [w,s,e,n];
}

function tileToGeoJSON (tile) {
    var bbox = tileToBBOX(tile);
    var poly = {
        type: 'Polygon',
        coordinates:
            [
                [
                    [bbox[0],bbox[1]],
                    [bbox[0], bbox[3]],
                    [bbox[2], bbox[3]],
                    [bbox[2], bbox[1]],
                    [bbox[0], bbox[1]]
                ]
            ]
    };
    return poly;
}

function tile2lon(x, z) {
    return (x/Math.pow(2,z)*360-180);
}

function tile2lat(y, z) {
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (r2d*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}

function pointToTile(lon, lat, z) {
    var tile = pointToTileFraction(lon, lat, z);
    tile[0] = Math.floor(tile[0]);
    tile[1] = Math.floor(tile[1]);
    return tile;
}

function getChildren (tile) {
    return [
        [tile[0]*2, tile[1]*2, tile[2]+1],
        [tile[0]*2+1, tile[1]*2, tile[2 ]+1],
        [tile[0]*2+1, tile[1]*2+1, tile[2]+1],
        [tile[0]*2, tile[1]*2+1, tile[2]+1],
    ];
}

function getParent (tile) {
    // top left
    if(tile[0]%2===0 && tile[1]%2===0) {
        return [tile[0]/2, tile[1]/2, tile[2]-1];
    }
    // bottom left
    else if((tile[0]%2===0) && (!tile[1]%2===0)) {
        return [tile[0]/2, (tile[1]-1)/2, tile[2]-1];
    }
    // top right
    else if((!tile[0]%2===0) && (tile[1]%2===0)) {
        return [(tile[0]-1)/2, (tile[1])/2, tile[2]-1];
    }
    // bottom right
    else {
        return [(tile[0]-1)/2, (tile[1]-1)/2, tile[2]-1];
    }
}

function getSiblings (tile) {
    return getChildren(getParent(tile));
}

function hasSiblings(tile, tiles) {
    var siblings = getSiblings(tile);
    for (var i = 0; i < siblings.length; i++) {
        if (!hasTile(tiles, siblings[i])) return false;
    }
    return true;
}

function hasTile(tiles, tile) {
    for (var i = 0; i < tiles.length; i++) {
        if (tilesEqual(tiles[i], tile)) return true;
    }
    return false;
}

function tilesEqual(tile1, tile2) {
    return (
        tile1[0] === tile2[0] &&
        tile1[1] === tile2[1] &&
        tile1[2] === tile2[2]
    );
}

function tileToQuadkey(tile) {
  var index = '';
  for (var z = tile[2]; z > 0; z--) {
      var b = 0;
      var mask = 1 << (z - 1);
      if ((tile[0] & mask) !== 0) b++;
      if ((tile[1] & mask) !== 0) b += 2;
      index += b.toString();
  }
  return index;
}

function quadkeyToTile(quadkey) {
    var x = 0;
    var y = 0;
    var z = quadkey.length;

    for (var i = z; i > 0; i--) {
        var mask = 1 << (i - 1);
        switch (quadkey[z - i]) {
            case '0':
                break;

            case '1':
                x |= mask;
                break;

            case '2':
                y |= mask;
                break;

            case '3':
                x |= mask;
                y |= mask;
                break;
        }
    }
    return [x,y,z];
}

function bboxToTile(bboxCoords) {
    var min = pointToTile(bboxCoords[0], bboxCoords[1], 32);
    var max = pointToTile(bboxCoords[2], bboxCoords[3], 32);
    var bbox = [min[0], min[1], max[0], max[1]];

    var z = getBboxZoom(bbox);
    if (z === 0) return [0,0,0];
    var x = bbox[0] >>> (32 - z);
    var y = bbox[1] >>> (32 - z);
    return [x,y,z];
}

function getBboxZoom(bbox) {
    var MAX_ZOOM = 28;
    for (var z = 0; z < MAX_ZOOM; z++) {
        var mask = 1 << (32 - (z + 1));
        if (((bbox[0] & mask) != (bbox[2] & mask)) ||
            ((bbox[1] & mask) != (bbox[3] & mask))) {
            return z;
        }
    }

    return MAX_ZOOM;
}

function pointToTileFraction(lon, lat, z) {
    var sin = Math.sin(lat * d2r),
        z2 = Math.pow(2, z),
        x = z2 * (lon / 360 + 0.5),
        y = z2 * (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
    return [x, y, z];
}

module.exports = {
    tileToGeoJSON: tileToGeoJSON,
    tileToBBOX: tileToBBOX,
    getChildren: getChildren,
    getParent: getParent,
    getSiblings: getSiblings,
    hasTile: hasTile,
    hasSiblings: hasSiblings,
    tilesEqual: tilesEqual,
    tileToQuadkey: tileToQuadkey,
    quadkeyToTile: quadkeyToTile,
    pointToTile: pointToTile,
    bboxToTile: bboxToTile,
    pointToTileFraction: pointToTileFraction
};
