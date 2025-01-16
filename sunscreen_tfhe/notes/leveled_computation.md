# Background
## Ciphertexts
We denote $Z_m$ to be the message space (which is often binary in our setting).

* LWE: encrypt $m \in Z_m$.
* GLWE: encrypts $m \in Z_m[X]/(X^N+1)$ where $N$ is a power of 2.
* GLEV: encrypts $m \in Z_m[X]/(X^N+1)$ where $N$ is a power of 2. Internally, the message is encrypted multiple times in different GLWE ciphertexts, but multiplied by different gadget coefficients in each one.
* GGSW: generally encrypts a polynomial of degree 2^N with coefficients in $Z_m$, but in our setting always encrypts the 0 or 1 polynomial. Is internally a bunch of GLEV ciphertexts encrypting $-S * m$ and one GLEV encrypting $m$. This ciphertexts exists to cause clever algebraic cancellation that allows for an outer product between GGSW and GLWE ciphertertexts.

## CMUX
At the heart of TFHE is the CMux operations, which takes 2 GLWE ciphertexts `a, b` and a `sel` GGSW ciphertext encrypting 0 or 1. CMux results in a new GLWE ciphertext encrypting `a` when `sel` is 0 and `b` when `sel` is 1.

We compute CMUX using the GGSW and GLWE outer produce and GLWE's additive homomorphism:

$$(b - a) * sel + a$$

We remark that CMUX is very fast like 40us and is the ideal primitive for computation.

## Computing with CMUX
Given an input set of GGSW ciphertexts each encrypting {0,1}, one can compute any function by passing the input GGSWs to the select lines of a cmux tree. Building such a mux tree is a trick taught in intro EE courses. Given a lookup table that produces output bit y, we do the following:

* For n inputs, create the canonical 2^n mux tree.
* For the ith input to the mux tree, we feed the constant containing the ith row in our lookup table under our output.

We can then apply the following rules to optimize the circuit:
* If both inputs are the same, replace mux with a wire to the next level. On the first level, this just means replacing the mux with a constant.
* Deduplicate any redundant muxes taking the same inputs.
* Repeat for each layer of the mux tree.
        
We can then optimize across truth tables using common subexpression elimination to remove redundant multiplexers across functions.

When applying this technique to TFHE, we can use trivial encryptions of the 0/1 polynomials as GLWE inputs to the MUX tree while the encrypted user input comes in as GGSW.

Published literature indicates one can compute CMux trees with a depth of > 20,000, indicating ample noise ceiling. For reference, a 32-bit addition circuit requires a mere depth of 64.

# A small problem
CMux takes user inputs as GGSW ciphertexts, but outputs GLWE ciphertexts 😑. This means you can't directly use the result of a MUX tree as an input to another and chain computation. Working around this requires a Rube-Goldberg sequence of cryptographic operations.
    
* Sample extract the GLWE result to produce an LWE under the compute noise parameters
* Keyswitch to a high-noise LWE ciphertext. This makes the next step cheaper.
* Circuit bootstrap (CBS) to GGSW

The result of the CBS operation can now be used in another MUX tree. Unfortunately, keyswitching is fairly expensive (a couple of ms per bit) and CBS is quite expensive (10s of ms per bit). Despite an ample noise budget to perform more computation, we're obligated to bootstrap only because we have to switch ciphertext types.

# A new approach: GLEVCMux
In an ideal world, we could convert directly from GLWE back to GGSW, skipping circuit bootstrapping. With a cheap and clever detour through GLEV, we can accomplish this.

Scheme switching as originally proposed allows one to take an RLEV ciphertext and scheme switch key and produce an RGSW ciphertext. We've extended this to [work in the GLWE setting as well](./glwe_scheme_switching.md). This isn't immediately, useful, but with a slight modification to CMux, it is exactly the missing piece we need. Unlike the CBS regime, Scheme switching is basically as fast as a CMux operation.

We remark that a GLEVCMux requires $\ell$ CMux operations.

## GLEVCMux
We propose a new GLEVCMux algorithm that takes `a`, `b` and GLEV ciphertexts instead of GLWE. The algorithm is quite simple: for each gadget-multiplied GLWE ciphertext in `a` and `b` compute the standard GLWE CMux against `sel`. This results in a new GLEV encrypting the same message as `a` when `sel` is 0 and `b` when `sel` is 1.

We can then use GLEVCMux trees to do our computation, scheme switch, and feed the resulting GGSWs into another GLEVCMux tree.

This incurs $\ell$ times the overhead when computing the CMUX tree, but these trees are linear in the input length for many operations (comparisons, add, sub, bitshift). For other operations such as integer multiplication and division, one could reformulate the computation as a series of smaller GLEVMUX trees. Or, you could use a different trick.

## PackedCMux
Let's revert back to our standard CMux for a minute. Under our original regime, we use trivial encryptions of the 0 and 1 polynomials. However, instead of the 1 polynomial, let's use a trivial encryption of a polynomial whose first $\ell$ coefficients are the gadget decomposed 1. Now when we run these polynomials through a mux tree, the resultant GLWE's first $\ell$ message coefficients contain the equivalent GLEV message.

We can use existing coefficient extraction techniques (e.g. homomorphic trace) to produce $\ell$ GLWE ciphertexts each containing a single gadget decomposed 0 (which is just zero) or $1/\beta^j$. These $\ell$ GLWE ciphertexts together form a GLEV cipertext! We can now scheme switch and continue computation.

This technique does not incur the $\ell$ factor overhead during CMUX computation, but requires extracting a few coefficients. Extrapolating results from Circuit Bootstrapping: Faster and Smaller by Wang et. al. we estimate this to take a millisecond or two, which is still an order of magnitude faster than the KS + CBS process.

# Another new approach: GGSWCMux
We can extend GLEVCmux to implement a GGSWCmux. However, this is going to require a new server key. Furthermore, this trick only works when we would otherwise be able to use a CMux tree with trivially encrypted a and b, which is fortunately always when using CMux-based computation.

## GGSWCMux server key
A GGSWCMux server key $sk_{ggswcmux}$ consists of k+1 (k being the GLWE size) GLEV encryptions encrypting 0 and -s_i for $0 \le i \lt j$ respectively. The GLEV encryption of zero can collapse to a single GLWE encryption of zero (as an optimization) since the each gadget decomposition of $-sk_i * 0$ is zero and thus we can reuse the same ciphertext.

We informally remark that these encrypt that these two values should exactly encrypt the same messages as a standard GGSW's first $k$ GLEV rows, so the exact make security analysis holds.

## GGSWCMux
Let GLEV $(s_0^i, s_1^i) = sk_{ggswcmux}$. If using the zero GLWE optimization, we can just repeat the singluar $s_0$ GLWE for each of the $s_0^i$ GLEV GLWE entries.

We now perform $k+1$ GLEV CMux operations for each entry in the CMux tree. The last one is a standard GLEV CMux. For the first $k$ GLEV CMux operations, in first layer of the CMux tree whenever we would pass a trivial GLEV encryption of 1, we instead pass $s_1^i$ and $s_0^i$ whenever we would pass a trivial GLEV encryption of 0.

After the CMux tree completes, we remark that that the first k resulting GLEV ciphertexts encrypt $-s * m$ and the last ciphertext encrypts $m$, thus forming a GGSW that can be used in subsequent CMux operations.