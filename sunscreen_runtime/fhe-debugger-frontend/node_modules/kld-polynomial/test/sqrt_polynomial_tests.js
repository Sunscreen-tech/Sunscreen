var assert = require('assert'),
    SqrtPolynomial = require('../index').SqrtPolynomial;


describe('SqrtPolynomial', () => {
    it("toString", () => {
        var poly = new SqrtPolynomial(2, 1, 0);

        assert.equal(poly.toString(), "sqrt(2t^2 + t)");
    })
});
