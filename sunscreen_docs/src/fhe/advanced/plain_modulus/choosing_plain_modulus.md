# Choosing the right plaintext modulus
The Sunscreen compiler makes your life easy by choosing encryption parameters on your behalf. While there is little reason to change most of the parameters, you might wish to restrict the compiler's choice for plaintext modulus.

Sunscreen defaults to a conservative modulus that ensures correctness for most applications, but there are reasons to change it:
* The default is too conservative. Decreasing the plain modulus can allow the compiler to choose more performant scheme parameters.
* You encounter overflow issues and need to increase it. This can reduce FHE program performance.
* You wish to use batching, which requires very specific values.

When setting the plain modulus, you pass a `PlainModulusConstraint`, which come in two forms
* `Raw(x)` sets the plain modulus to `x`.
* `BatchingMinimum(x)` chooses a value suitable for use with batching with at least `x` bits of precision. As noted in the name, this modulus should be used with batching.
