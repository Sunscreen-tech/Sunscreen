var assert   = require('assert'),
    Point2D  = require('../lib/Point2D'),
    Vector2D = require('../lib/Vector2D'),
    Matrix2D = require('../lib/Matrix2D');

describe('Point2D', () => {
    it("new point", () => {
        let p = new Point2D(10, 20);

        assert.equal(p.x, 10);
        assert.equal(p.y, 20);
    });

    it("clone", () => {
        let p = new Point2D(10, 20);
        let c = p.clone();

        assert.equal(p.x, c.x);
        assert.equal(p.y, c.y);
        assert.equal(c.x, 10);
        assert.equal(c.y, 20);
    });

    it("add", () => {
        let p1 = new Point2D(10, 20);
        let p2 = new Point2D(20, 30);
        let p3 = p1.add(p2);

        assert.equal(p3.x, 30);
        assert.equal(p3.y, 50);
    });

    it("subtract", () => {
        let p1 = new Point2D(10, 20);
        let p2 = new Point2D(20, 40);
        let p3 = p1.subtract(p2);

        assert.equal(p3.x, -10);
        assert.equal(p3.y, -20);
    });

    it("multiply", () => {
        let p1 = new Point2D(10, 20);
        let p2 = p1.multiply(0.5);

        assert.equal(p2.x, 5);
        assert.equal(p2.y, 10);
    });

    it("divide", () => {
        let p1 = new Point2D(10, 20);
        let p2 = p1.divide(2);

        assert.equal(p2.x, 5);
        assert.equal(p2.y, 10);
    });

    it("equal", () => {
        let p1 = new Point2D(10, 20);
        let p2 = new Point2D(10, 20);

        assert.equal(p1.equals(p2), true);
    });

    it("not equal", () => {
        let p1 = new Point2D(10, 20);
        let p2 = new Point2D(10, 21);

        assert.equal(p1.equals(p2), false);
    });

    it("interpolate between two points", () => {
        let p1 = new Point2D(10, 20);
        let p2 = new Point2D(30, 40);
        let p3 = p1.lerp(p2, 0.25);

        assert.equal(p3.x, 15);
        assert.equal(p3.y, 25);
    });

    it("distance between two points", () => {
        let p1 = new Point2D(10, 20);
        let p2 = new Point2D(13, 24);
        let dist = p1.distanceFrom(p2);

        assert.equal(dist, 5);
    });

    it("min", () => {
        let p1 = new Point2D(30, 5);
        let p2 = new Point2D(10, 50);
        let p3 = p1.min(p2);

        assert.equal(p3.x, 10);
        assert.equal(p3.y, 5);
    });

    it("max", () => {
        let p1 = new Point2D(30, 5);
        let p2 = new Point2D(10, 50);
        let p3 = p1.max(p2);

        assert.equal(p3.x, 30);
        assert.equal(p3.y, 50);
    });

    it("translate", () => {
        var p1 = new Point2D(10, 20);
        var m = new Matrix2D().translate(20, 30);
        var p2 = p1.transform(m);

        assert.equal(p2.x, 30);
        assert.equal(p2.y, 50);
    });

    it("scale", () => {
        var p1 = new Point2D(10, 20);
        var m = new Matrix2D().scale(2);
        var p2 = p1.transform(m);

        assert.equal(p2.x, 20);
        assert.equal(p2.y, 40);
    });

    it("scale non-uniform", () => {
        var p1 = new Point2D(10, 20);
        var m = new Matrix2D().scaleNonUniform(2, 3);
        var p2 = p1.transform(m);

        assert.equal(p2.x, 20);
        assert.equal(p2.y, 60);
    });

    it("rotate", () => {
        var p1 = new Point2D(10, 0);
        var m = new Matrix2D().rotate(Math.PI / 4.0);
        var p2 = p1.transform(m);

        assert.equal(p2.x, 7.0710678118654755);
        assert.equal(p2.y, 7.071067811865475);
    });

    it("rotate from vector", () => {
        var p1 = new Point2D(10, 0);
        var v = new Vector2D(Math.PI / 4.0, Math.PI / 4.0);
        var m = new Matrix2D().rotateFromVector(v);
        var p2 = p1.transform(m);

        assert.equal(p2.x, 7.0710678118654755);
        assert.equal(p2.y, 7.0710678118654755);
    });

    it("flip x", () => {
        var p1 = new Point2D(10, 20);
        var m = new Matrix2D().flipX();
        var p2 = p1.transform(m);

        assert.equal(p2.x, -10);
        assert.equal(p2.y, 20);
    });

    it("flip y", () => {
        var p1 = new Point2D(10, 20);
        var m = new Matrix2D().flipY();
        var p2 = p1.transform(m);

        assert.equal(p2.x, 10);
        assert.equal(p2.y, -20);
    });

    it("inverse transform", () => {
        var p1 = new Point2D(10, 20);
        var m = new Matrix2D().translate(30, 50).inverse();
        var p2 = p1.transform(m);

        assert.equal(p2.x, -20);
        assert.equal(p2.y, -30);
    });

    it("to string", () => {
        var p = new Point2D(10, 20);

        assert.equal("point(10,20)", p.toString());
    });
});
