# line-intersect

Line vs line, point vs line

Math is mostly from [here](https://web.archive.org/web/20060808212243/http://local.wasp.uwa.edu.au/~pbourke/geometry/lineline2d).

## Install

```bash
npm install line-intersect
```

## API

es modules

```js
import {
  checkIntersection,
  colinearPointWithinSegment
} from 'line-intersect';
```

commonjs modules

```js
const {
  checkIntersection,
  colinearPointWithinSegment
} = require('line-intersect');
```

### checkIntersection(x1, y1, x2, y2, x3, y3, x4, y4)

Given a line segment from (x1, y1) to (x2, y2) and line segment from (x3, y3) to (x4, y4), check if the line segments intersect.

#### Parameters

- x1, y1, x2, y2 - 1st line segment
- x3, y3, x4, y4 - 2nd line segment

All params are Numbers and are required.

#### Returns

A read-only Object that looks like

```js
{
  type: 'none' | 'parallel' | 'colinear' | 'intersecting',
  point: {
    x: <Number>,
    y: <Number>
  }
}
```

Note: `point` is `undefined` unless `type == 'intersecting'`

| `type` | What it means | Are the line segments touching? |
|-----------------|-----------------------------------------------------------------------|----|
| 'none'          | Line segments are not intersecting                                  | No |
| 'parallel'      | Line segments are not intersecting but they are parallel to eachother | No |
| 'colinear'      | Line segments are on the same line and *may* be overlapping. Use `colinearPointWithinSegment()` to check | Maybe |
| 'intersecting'  | Line segments intersect at exactly one point | Yes |

### colinearPointWithinSegment(px, py, x1, y1, x2, y2)

Given a point (px, py) that is on the same line as line segment (x1, y1) to (x2, y2), check if the point is within the line segment.

#### Parameters

- px, py - Point to check
- x1, y1, x2, y2 - Line segment

All params are Numbers and are required.

#### Returns

`true` if point is within the line segment, `false` otherwise.

## License

MIT
