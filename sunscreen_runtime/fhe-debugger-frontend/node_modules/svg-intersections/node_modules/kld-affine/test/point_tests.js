var Point2D = require('../lib/Point2D'),
    Vector2D = require('../lib/Vector2D'),
    Matrix2D = require('../lib/Matrix2D');

exports.newPoint = function(beforeExit, assert) {
    var p = new Point2D(10, 20);

    assert.equal(p.x, 10);
    assert.equal(p.y, 20);
};

exports.clone = function(beforeExit, assert) {
    var p = new Point2D(10, 20);
    var c = p.clone();

    assert.equal(p.x, c.x);
    assert.equal(p.y, c.y);
    assert.equal(c.x, 10);
    assert.equal(c.y, 20);
};

exports.addPoint = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var p2 = new Point2D(20, 30);
    var p3 = p1.add(p2);

    assert.equal(p3.x, 30);
    assert.equal(p3.y, 50);
};

exports.addVector = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var v1 = new Vector2D(20, 30);
    var p2 = p1.add(v1);

    assert.equal(p2.x, 30);
    assert.equal(p2.y, 50);
};

exports.subtractPoint = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var p2 = new Point2D(20, 40);
    var p3 = p1.subtract(p2);

    assert.equal(p3.x, -10);
    assert.equal(p3.y, -20);
};

exports.subtractVector = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var v1 = new Vector2D(20, 40);
    var p2 = p1.subtract(v1);

    assert.equal(p2.x, -10);
    assert.equal(p2.y, -20);
};

exports.multiply = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var p2 = p1.multiply(0.5);

    assert.equal(p2.x, 5);
    assert.equal(p2.y, 10);
};

exports.divide = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var p2 = p1.divide(2);

    assert.equal(p2.x, 5);
    assert.equal(p2.y, 10);
};

exports.equals = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var p2 = new Point2D(10, 20);
    var p3 = new Point2D(10, 21);

    assert.equal(p1.equals(p2), true);
    assert.equal(p1.equals(p3), false);
};

exports.lerpPoint = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var p2 = new Point2D(30, 40);
    var p3 = p1.lerp(p2, 0.25);

    assert.equal(p3.x, 15);
    assert.equal(p3.y, 25);
};

exports.lerpVector = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var v1 = new Vector2D(30, 40);
    var p2 = p1.lerp(v1, 0.25);

    assert.equal(p2.x, 15);
    assert.equal(p2.y, 25);
};

exports.distanceFrom = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var p2 = new Point2D(13, 24);
    var dist = p1.distanceFrom(p2);

    assert.equal(dist, 5);
};

exports.min = function(beforeExit, assert) {
    var p1 = new Point2D(30, 5);
    var p2 = new Point2D(10, 50);
    var p3 = p1.min(p2);

    assert.equal(p3.x, 10);
    assert.equal(p3.y, 5);
};

exports.max = function(beforeExit, assert) {
    var p1 = new Point2D(30, 5);
    var p2 = new Point2D(10, 50);
    var p3 = p1.max(p2);

    assert.equal(p3.x, 30);
    assert.equal(p3.y, 50);
};

exports.translateTransform = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var m = new Matrix2D().translate(20, 30);
    var p2 = p1.transform(m);

    assert.equal(p2.x, 30);
    assert.equal(p2.y, 50);
};

exports.scaleTransform = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var m = new Matrix2D().scale(2);
    var p2 = p1.transform(m);

    assert.equal(p2.x, 20);
    assert.equal(p2.y, 40);
};

exports.scaleNonUniformTransform = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var m = new Matrix2D().scaleNonUniform(2, 3);
    var p2 = p1.transform(m);

    assert.equal(p2.x, 20);
    assert.equal(p2.y, 60);
};

exports.rotateTransform = function(beforeExit, assert) {
    var p1 = new Point2D(10, 0);
    var m = new Matrix2D().rotate(Math.PI / 4.0);
    var p2 = p1.transform(m);

    assert.equal(p2.x, 7.0710678118654755);
    assert.equal(p2.y, 7.071067811865475);
};

exports.rotateFromVectorTransform = function(beforeExit, assert) {
    var p1 = new Point2D(10, 0);
    var v = new Vector2D(Math.PI / 4.0, Math.PI / 4.0);
    var m = new Matrix2D().rotateFromVector(v);
    var p2 = p1.transform(m);

    assert.equal(p2.x, 7.0710678118654755);
    assert.equal(p2.y, 7.0710678118654755);
};

exports.flipXTransform = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var m = new Matrix2D().flipX();
    var p2 = p1.transform(m);

    assert.equal(p2.x, -10);
    assert.equal(p2.y, 20);
};

exports.flipYTransform = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var m = new Matrix2D().flipY();
    var p2 = p1.transform(m);

    assert.equal(p2.x, 10);
    assert.equal(p2.y, -20);
};

exports.inverseTransform = function(beforeExit, assert) {
    var p1 = new Point2D(10, 20);
    var m = new Matrix2D().translate(30, 50).inverse();
    var p2 = p1.transform(m);

    assert.equal(p2.x, -20);
    assert.equal(p2.y, -30);
};

exports.toString = function(beforeExit, assert) {
    var p = new Point2D(10, 20);

    assert.equal("point(10,20)", p.toString());
};

// exports.setX = function(beforeExit, assert) {
//     var p = new Point2D(10, 20);

//     p.x = 20;

//     console.log(p.toString());
// };
