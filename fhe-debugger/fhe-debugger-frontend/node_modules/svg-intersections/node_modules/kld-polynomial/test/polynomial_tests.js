var Polynomial = require('../lib/Polynomial');

exports.newPolynomial = function(beforeExit, assert) {
    var poly = new Polynomial(2, 1, 0);

    assert.equal("2t^2 + t", poly.toString());
};
