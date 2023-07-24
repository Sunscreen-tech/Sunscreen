export function simplify(coords, first, last, sqTolerance) {
  let maxSqDist = sqTolerance;
  const mid = last - first >> 1;
  let minPosToMid = last - first;
  let index;
  const ax = coords[first];
  const ay = coords[first + 1];
  const bx = coords[last];
  const by = coords[last + 1];
  for (let i = first + 3; i < last; i += 3) {
    const d = getSqSegDist(coords[i], coords[i + 1], ax, ay, bx, by);
    if (d > maxSqDist) {
      index = i;
      maxSqDist = d;
    } else if (d === maxSqDist) {
      const posToMid = Math.abs(i - mid);
      if (posToMid < minPosToMid) {
        index = i;
        minPosToMid = posToMid;
      }
    }
  }
  if (maxSqDist > sqTolerance) {
    if (index - first > 3) simplify(coords, first, index, sqTolerance);
    coords[index + 2] = maxSqDist;
    if (last - index > 3) simplify(coords, index, last, sqTolerance);
  }
}
function getSqSegDist(px, py, x, y, bx, by) {
  let dx = bx - x;
  let dy = by - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = bx;
      y = by;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}
//# sourceMappingURL=simplify.js.map