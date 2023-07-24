# kld-affine

A collection of classes used for affine geometry. This currently consists of the following classes:

* Point2D
* Vector2D
* Matrix2D

These have been extracted from kld-intersections so they can stand alone.

## Install

    npm install kld-affine

## Point2D

A class used to represent two-dimensional points on a plane. This currently supports the following methods:

* clone
* add
* subtract
* multiply
* divide
* equals
* precisionEquals
* lerp
* distanceFrom
* min
* max
* transform
* toString

## Vector2D

A class used to represent a two-dimensional vector. This currently supports the following methods:

* Vector2D.fromPoints
* length
* magnitude
* dot
* cross
* determinant
* unit
* add
* subtract
* multiply
* divide
* angleBetween
* perp
* perpendicular
* project
* transform
* equals
* precisionEquals
* toString

## Matrix2D

A class used to represent affine transformations. This current supports the following methods:

* Matrix2D.IDENTITY
* Matrix2D.translation
* Matrix2D.scaling
* Matrix2D.scalingAt
* Matrix2D.nonUniformScaling
* Matrix2D.nonUniformScalingAt
* Matrix2D.rotation
* Matrix2D.rotationAt
* Matrix2D.rotationFromVector
* Matrix2D.xFlip
* Matrix2D.yFlip
* Matrix2D.xSkew
* Matrix2D.ySkew
* multiply
* inverse
* translate
* scale
* scaleAt
* scaleNonUniform
* scaleNonUniformAt
* rotate
* rotateAt
* rotateFromVector
* flipX
* flipY
* skewX
* skewY
* isIdentity
* isInvertible
* getScale
* getDecomposition
* equals
* precisionEquals
* toString
