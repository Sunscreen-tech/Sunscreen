var Matrix2D = require('./../lib/Matrix2D');

exports.newMatrix = function(beforeExit, assert) {
    var m = new Matrix2D();

    assert.equal(m.a, 1);
    assert.equal(m.b, 0);
    assert.equal(m.c, 0);
    assert.equal(m.d, 1);
    assert.equal(m.e, 0);
    assert.equal(m.f, 0);
};

exports.IDENTITY = function(beforeExit, assert) {
    var m = Matrix2D.IDENTITY;

    assert.equal(m.a, 1);
    assert.equal(m.b, 0);
    assert.equal(m.c, 0);
    assert.equal(m.d, 1);
    assert.equal(m.e, 0);
    assert.equal(m.f, 0);
};

exports.multiply = function(beforeExit, assert) {

};

exports.inverse = function(beforeExit, assert) {

};

exports.translate = function(beforeExit, assert) {

};

exports.scale = function(beforeExit, assert) {

};

exports.scaleAt = function(beforeExit, assert) {

};

exports.scaleNonUniform = function(beforeExit, assert) {

};

exports.scaleNonUniformAt = function(beforeExit, assert) {

};

exports.rotate = function(beforeExit, assert) {

};

exports.rotateAt = function(beforeExit, assert) {

};

exports.rotateFromVector = function(beforeExit, assert) {

};

exports.flipX = function(beforeExit, assert) {

};

exports.flipY = function(beforeExit, assert) {

};

exports.skewX = function(beforeExit, assert) {

};

exports.skewY = function(beforeExit, assert) {

};

exports.isIdentity = function(beforeExit, assert) {

};

exports.isInvertible = function(beforeExit, assert) {

};

exports.getScale = function(beforeExit, assert) {

};

exports.equals = function(beforeExit, assert) {

};

exports.toString = function(beforeExit, assert) {
    var m = new Matrix2D();

    assert.equal(m.toString(), "matrix(1,0,0,1,0,0)");
};
