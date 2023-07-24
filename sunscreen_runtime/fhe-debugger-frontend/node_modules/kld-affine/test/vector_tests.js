let assert   = require('assert'),
    Vector2D = require('../lib/Vector2D'),
    Point2D  = require('../lib/Point2D'),
    Matrix2D = require('../lib/Matrix2D'),
    origin   = new Point2D(0, 0),
    p1       = new Point2D(3, 4),
    p2       = new Point2D(6, 8),
    v1       = new Vector2D(3, 4),
    v2       = new Vector2D(2, 2);


describe("Vector2D", () => {
    it("new vector", () => {
        let v = new Vector2D(10, 20);

        assert.equal(v.x, 10);
        assert.equal(v.y, 20);
    });

    it("vector from two points", () => {
        let v = Vector2D.fromPoints(p1, p2);

        assert.equal(v.x, 3);
        assert.equal(v.y, 4);
    });

    it("length", () => {
        let v = new Vector2D(3, 4),
            length = v.length();

        assert.equal(length, 5);
    });

    it("magnitude", () => {
        let magnitude = v1.magnitude();

        assert.equal(magnitude, 25);
    });

    it("dot", () => {
        let dot = v1.dot(v2);

        assert.equal(dot, 14);
    });

    it("cross", () => {
        let cross = v1.cross(v2);

        assert.equal(cross, -2);
    });

    it("determinant", () => {
        let determinant = v1.determinant(v2);

        assert.equal(determinant, -2);
    });

    it("unit", () => {
        let unit = v1.unit();

        assert.equal(unit.x, 0.6);
        assert.equal(unit.y, 0.8);
    });

    it("add", () => {
        let newv = v1.add(v2);

        assert.equal(newv.x, 5);
        assert.equal(newv.y, 6);
    });

    it("subtract", () => {
        let newv = v1.subtract(v2);

        assert.equal(newv.x, 1);
        assert.equal(newv.y, 2);
    });

    it("multiply", () => {
        let newv = v1.multiply(2);

        assert.equal(newv.x, 6);
        assert.equal(newv.y, 8);
    });

    it("divide", () => {
        let newv = v2.divide(2);

        assert.equal(newv.x, 1);
        assert.equal(newv.y, 1);
    });

    it("angleBetween", () => {
        let v1 = new Vector2D(1, 0),
            v2 = new Vector2D(0, 1),
            perp1 = v1.angleBetween(v2),
            perp2 = v2.angleBetween(v1);

        assert.equal(perp1, -perp2);
        assert.equal(perp1, Math.PI/2);

    });

    it("perp", () => {
        let perp = v1.perp(),
            phi = v1.angleBetween(perp);

        assert.equal(perp.x, -v1.y);
        assert.equal(perp.y, v1.x);
        assert.equal(phi, Math.PI/2);
    });

    it("perpendicular", () => {
        let perpendicular = v1.perpendicular(v2);

        assert.equal(perpendicular.x, -0.5);
        assert.equal(perpendicular.y, 0.5);
    });

    it("project", () => {
        let project = v1.project(v2);

        assert.equal(project.x, 3.5);
        assert.equal(project.y, 3.5);
    });

    it("transform", () => {
        let m = new Matrix2D(1, 1, 1, 1, 1, 1),
            a = v1.transform(Matrix2D.IDENTITY),
            b = v1.transform(m);

        assert.equal(a.x, v1.x);
        assert.equal(a.y, v1.y);

        assert.equal(b.x, b.y);
        assert.equal(b.x, 7);
    });

    it("equals", () => {
        let t = v1.equals(v1),
            f = v1.equals(v2);

        assert.equal(t, true);
        assert.equal(f, false);
    });

    it("to string", () => {
        let str = v1.toString();

        assert.equal(str, 'vector(3,4)');
    });
});