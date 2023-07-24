var COLINEAR = intersectResult('colinear');
var PARALLEL = intersectResult('parallel');
var NONE = intersectResult('none');
/**
* Check how two line segments intersect eachother. Line segments are represented
* as (x1, y1)-(x2, y2) and (x3, y3)-(x4, y4).
*
* @param {number} x1
* @param {number} y1
* @param {number} x2
* @param {number} y2
* @param {number} x3
* @param {number} y3
* @param {number} x4
* @param {number} y4
* @return {object} Object describing intersection that looks like
*    {
*      type: none|parallel|colinear|intersecting,
*      point: {x, y} - only defined when type == intersecting
*    }
*/

export function checkIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  var denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  var numeA = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  var numeB = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);

  if (denom == 0) {
    if (numeA == 0 && numeB == 0) {
      return COLINEAR;
    }

    return PARALLEL;
  }

  var uA = numeA / denom;
  var uB = numeB / denom;

  if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
    return intersecting({
      x: x1 + uA * (x2 - x1),
      y: y1 + uA * (y2 - y1)
    });
  }

  return NONE;
}

function intersecting(point) {
  var result = intersectResult('intersecting');
  result.point = point;
  return result;
}

function intersectResult(type) {
  return {
    type: type
  };
}