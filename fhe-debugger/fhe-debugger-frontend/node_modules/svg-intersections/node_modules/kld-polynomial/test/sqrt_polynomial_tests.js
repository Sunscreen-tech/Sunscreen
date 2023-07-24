var SqrtPolynomial = require('../lib/SqrtPolynomial');

exports.newPolynomial = function(beforeExit, assert) {
    var poly = new SqrtPolynomial(2, 1, 0);

    assert.equal("sqrt(2t^2 + t)", poly.toString());
};
