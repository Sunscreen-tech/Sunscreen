# Why is a compiler needed for FHE?
> Why is it so hard to write FHE programs?

*Note:* The following is not a *precise description* of the math behind FHE. Our goal is to give you a high level overview as to why it's hard to work with FHE directly. 

FHE makes use of some pretty fancy math&mdash;namely, [lattices](https://en.wikipedia.org/wiki/Lattice_(group)). In fact, all known FHE schemes use lattice-based cryptography. Something special about lattice-based cryptography is that it's [post-quantum](https://en.wikipedia.org/wiki/Post-quantum_cryptography).

You're likely familiar with matrices and vectors. Imagine that instead of having *numbers* as the entries in a matrix or vector, we replace them with *polynomials* (e.g. \\(8x^5+5x^2+x+13\\)). You might wonder: why would we want to have polynomials instead of numbers as entries? Well, replacing a number with a polynomial allows us to embed *many* numbers (as coefficients) in a single matrix entry, thus leading to better efficiency/performance.  Recall that polynomials consist of coefficients (these would be `8`, `5`, `1`, `13` in our example) and a degree/order (this is 5 in our example). However, these polynomials behave a bit differently than what you've seen in grade school. 

Let's take a brief detour and discuss modular arithmetic (aka clock arithmetic). Modular arithmetic is just integer arithmetic that "wraps" around. Alternatively, you can think of it as division with remainder. For example, `13 mod 12 = 1`.

The polynomials in FHE make use of modular arithmetic. The degree is actually mod some value; we'll say degree mod `N`. The coefficients are also mod some value; we'll say coefficient mod `P`. 

So if I tell you to take the degree `mod 3` and the coefficients `mod 7`, \\(8x^5+5x^2+x+13\\) becomes \\(1x^2+5x^2+x+6\\). 

To get good performance in FHE, you need to know how to set these parameters (N, P) *just right*. If the parameters are too small, you'll be very limited in terms of the computations you can do. Alternatively, if you make the parameters too big, you'll end with poor performance and large ciphertext sizes. Even worse, you need to base your parameter choices off the maximum sequence of multiplications you plan on doing along with the desired security level.

Finally, I've neglected to mention how FHE programs actually work. Under the hood, FHE uses circuits. For the BFV scheme, we have arithmetic circuits (some other FHE schemes use binary circuits). When was the last time you tried to work directly with circuits (if ever)? 

Our compiler handles picking all parameters and the appropriate keys for you. We abstract away the polynomials and circuits too.

