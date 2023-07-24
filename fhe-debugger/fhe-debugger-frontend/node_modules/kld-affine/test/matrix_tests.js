let assert   = require('assert'),
    lib      = require('../index'),
    Matrix2D = lib.Matrix2D,
    Point2D  = lib.Point2D,
    Vector2D = lib.Vector2D;

describe('Matrix2D', () => {
    describe('Methods', () => {
        it("new matrix", () => {
            let m = new Matrix2D();

            assert.equal(m.a, 1);
            assert.equal(m.b, 0);
            assert.equal(m.c, 0);
            assert.equal(m.d, 1);
            assert.equal(m.e, 0);
            assert.equal(m.f, 0);
        });

        it("to string", () => {
            let m = new Matrix2D();

            assert.equal(m.toString(), "matrix(1,0,0,1,0,0)");
        });
        /*
        it("multiply", () => {});
        it("inverse", () => {});
        it("translate", () => {});
        it("scale", () => {});
        it("scaleAt", () => {});
        it("scaleNonUniform", () => {});
        it("scaleNonUniformAt", () => {});
        it("rotate", () => {});
        it("rotateAt", () => {});
        it("rotateFromVector", () => {});
        it("flipX", () => {});
        it("flipY", () => {});
        it("skewX", () => {});
        it("skewY", () => {});
        it("isIdentity", () => {});
        it("isInvertible", () => {});
        it("getScale", () => {});
        it("equals", () => {});
        */
    });

    describe('Statics', () => {
        it("IDENTITY", () => {
            let m = Matrix2D.IDENTITY;

            assert.equal(m.a, 1);
            assert.equal(m.b, 0);
            assert.equal(m.c, 0);
            assert.equal(m.d, 1);
            assert.equal(m.e, 0);
            assert.equal(m.f, 0);
        });

        it("translation", () => {
            let tx = 10;
            let ty = 20;
            let m1 = Matrix2D.translation(tx, ty);
            let m2 = (new Matrix2D()).translate(tx, ty);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("scaling", () => {
            let s = 1.5;
            let m1 = Matrix2D.scaling(s);
            let m2 = (new Matrix2D()).scale(s);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("scalingAt", () => {
            let s = 1.5;
            let center = new Point2D(10, 20);
            let m1 = Matrix2D.scalingAt(s, center);
            let m2 = (new Matrix2D()).scaleAt(s, center);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("non-uniform scaling", () => {
            let sx = 1.5;
            let sy = 0.5;
            let m1 = Matrix2D.nonUniformScaling(sx, sy);
            let m2 = (new Matrix2D()).scaleNonUniform(sx, sy);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("non-uniform scalingAt", () => {
            let sx = 1.5;
            let sy = 0.5;
            let center = new Point2D(10, 20);
            let m1 = Matrix2D.nonUniformScalingAt(sx, sy, center);
            let m2 = (new Matrix2D()).scaleNonUniformAt(sx, sy, center);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("rotation", () => {
            let a = 45.0 * Math.PI / 180.0;
            let m1 = Matrix2D.rotation(a);
            let m2 = (new Matrix2D()).rotate(a);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("rotationAt", () => {
            let a = 45.0 * Math.PI / 180.0;
            let center = new Point2D(10, 20);
            let m1 = Matrix2D.rotationAt(a, center);
            let m2 = (new Matrix2D()).rotateAt(a, center);

            assert(m1.precisionEquals(m2, 1e-15), `${m1.toString()} != ${m2.toString()}`);
        });

        it("rotation from vector", () => {
            let v = new Vector2D(10, 20);
            let m1 = Matrix2D.rotationFromVector(v);
            let m2 = (new Matrix2D()).rotateFromVector(v);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("x flip", () => {
            let m1 = Matrix2D.xFlip();
            let m2 = (new Matrix2D()).flipX();

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("y flip", () => {
            let m1 = Matrix2D.yFlip();
            let m2 = (new Matrix2D()).flipY();

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("x skew", () => {
            let a = 30 * Math.PI / 180.0;
            let m1 = Matrix2D.xSkew(a);
            let m2 = (new Matrix2D()).skewX(a);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });

        it("y skew", () => {
            let a = 30 * Math.PI / 180.0;
            let m1 = Matrix2D.ySkew(a);
            let m2 = (new Matrix2D()).skewY(a);

            assert(m1.equals(m2), `${m1.toString()} != ${m2.toString()}`);
        });
    });
});
