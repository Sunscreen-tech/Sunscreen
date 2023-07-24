/**
 *
 *   Point2D.js
 *
 *   copyright 2001-2002, 2013 Kevin Lindsey
 *
 */

/**
 *  Point2D
 *
 *  @param {Number} x
 *  @param {Number} y
 *  @returns {Point2D}
 */
function Point2D(x, y) {
    Object.defineProperties(this, {
        "x": {
            value: x,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "y": {
            value: y,
            writable: false,
            enumerable: true,
            configurable: false
        }
    });
    // this.x = x;
    // this.y = y;
}

/**
 *  clone
 *
 *  @returns {Point2D}
 */
Point2D.prototype.clone = function() {
    return new this.constructor(this.x, this.y);
};

/**
 *  add
 *
 *  @param {Point2D|Vector2D} that
 *  @returns {Point2D}
 */
Point2D.prototype.add = function(that) {
    return new this.constructor(this.x+that.x, this.y+that.y);
};

/**
 *  subtract
 *
 *  @param { Vector2D | Point2D } that
 *  @returns {Point2D}
 */
Point2D.prototype.subtract = function(that) {
    return new this.constructor(this.x-that.x, this.y-that.y);
};

/**
 *  multiply
 *
 *  @param {Number} scalar
 *  @returns {Point2D}
 */
Point2D.prototype.multiply = function(scalar) {
    return new this.constructor(this.x*scalar, this.y*scalar);
};

/**
 *  divide
 *
 *  @param {Number} scalar
 *  @returns {Point2D}
 */
Point2D.prototype.divide = function(scalar) {
    return new this.constructor(this.x/scalar, this.y/scalar);
};

/**
 *  equals
 *
 *  @param {Point2D} that
 *  @returns {Boolean}
 */
Point2D.prototype.equals = function(that) {
    return ( this.x === that.x && this.y === that.y );
};

// utility methods

/**
 *  lerp
 *
 *  @param { Vector2D | Point2D } that
 *  @param {Number} t
 @  @returns {Point2D}
 */
Point2D.prototype.lerp = function(that, t) {
    var omt = 1.0 - t;

    return new this.constructor(
        this.x * omt + that.x * t,
        this.y * omt + that.y * t
    );
};

/**
 *  distanceFrom
 *
 *  @param {Point2D} that
 *  @returns {Number}
 */
Point2D.prototype.distanceFrom = function(that) {
    var dx = this.x - that.x;
    var dy = this.y - that.y;

    return Math.sqrt(dx*dx + dy*dy);
};

/**
 *  min
 *
 *  @param {Point2D} that
 *  @returns {Number}
 */
Point2D.prototype.min = function(that) {
    return new this.constructor(
        Math.min( this.x, that.x ),
        Math.min( this.y, that.y )
    );
};

/**
 *  max
 *
 *  @param {Point2D} that
 *  @returns {Number}
 */
Point2D.prototype.max = function(that) {
    return new this.constructor(
        Math.max( this.x, that.x ),
        Math.max( this.y, that.y )
    );
};

/**
 *  transform
 *
 *  @param {Matrix2D}
 *  @result {Point2D}
 */
Point2D.prototype.transform = function(matrix) {
    return new this.constructor(
        matrix.a * this.x + matrix.c * this.y + matrix.e,
        matrix.b * this.x + matrix.d * this.y + matrix.f
    );
};

/**
 *  toString
 *
 *  @returns {String}
 */
Point2D.prototype.toString = function() {
    return "point(" + this.x + "," + this.y + ")";
};

if (typeof module !== "undefined") {
    module.exports = Point2D;
}
