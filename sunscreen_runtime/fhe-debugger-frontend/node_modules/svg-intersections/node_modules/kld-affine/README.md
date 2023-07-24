kld-affine
==========

A collection of classes used for affine geometry. This currently consists of the following:

* Point2D
* Vector2D
* Matrix2D

These have been extracted from kld-intersections so they can stand alone.

Please note that as of version 0.0.7, all of the self-modifying functions (like addEquals, subtractEquals, etc.) have been removed.

Install
-------
    npm install kld-affine

Point2D
-------

A class used to represent two-dimensional points on a plane. This currently supports the following methods:

* clone
* add
* subtract
* multiply
* divide
* equals
* lerp
* distanceFrom
* min
* max
* transform
* toString

Vector2D
--------
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
* toString

Matrix2D
--------
A class used to represent affine transformations. This current supports the following methods:

* Matrix2D.IDENTITY
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
* equals
* toString
