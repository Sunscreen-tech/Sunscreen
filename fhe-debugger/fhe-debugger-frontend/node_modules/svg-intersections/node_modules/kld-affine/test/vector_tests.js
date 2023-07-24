var Vector2D = require('../lib/Vector2D');

exports.newVector = function(beforeExit, assert) {
    var v = new Vector2D(10, 20);

    assert.equal(v.x, 10);
    assert.equal(v.y, 20);
};

exports.vectorFromPoints = function(beforeExit, assert) {
    var v = Vector2D.fromPoints({ x : 0, y : 0 }, { x : 10, y : 20 });

    assert.equal(v.x, 10);
    assert.equal(v.y, 20);
};

exports.fromPoints = function(beforeExit, assert) {
};

exports.length = function(beforeExit, assert) {
};

exports.magnitude = function(beforeExit, assert) {
};

exports.dot = function(beforeExit, assert) {
};

exports.cross = function(beforeExit, assert) {
};

exports.determinant = function(beforeExit, assert) {
};

exports.unit = function(beforeExit, assert) {
};

exports.add = function(beforeExit, assert) {
};

exports.subtract = function(beforeExit, assert) {
};

exports.multiply = function(beforeExit, assert) {
};

exports.divide = function(beforeExit, assert) {
};

exports.angleBetween = function(beforeExit, assert) {
};

exports.perp = function(beforeExit, assert) {
};

exports.perpendicular = function(beforeExit, assert) {
};

exports.project = function(beforeExit, assert) {
};

exports.transform = function(beforeExit, assert) {
};

exports.equals = function(beforeExit, assert) {
};

exports.toString = function(beforeExit, assert) {
};

// exports.setX = function(beforeExit, assert) {
//     var v = new Vector2D(10, 20);

//     v.x = 20;

//     console.log(v.toString());
// };
