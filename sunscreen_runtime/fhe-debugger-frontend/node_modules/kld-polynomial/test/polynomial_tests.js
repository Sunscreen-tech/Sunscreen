let assert = require('assert'),
    Polynomial = require('../index').Polynomial;


describe('Polynomial', () => {
    it('toString', () => {
        let poly = new Polynomial(2, 1, 0);

        assert.equal(poly.toString(), "2t^2 + t");
    })
});
