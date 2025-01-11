/// Ciphertext operations where one of the operands is in FFT form.
pub mod fft_ops;

/// Methods for key switching a ciphertext from one key to another, potentially
/// switching the parameters at the same time.
pub mod keyswitch;

/// Methods for bootstrapping an LWE ciphertext from one key to another, while
/// refreshing the noise in the ciphertext.
pub mod bootstrapping;

/// Methods for homomorphic operations on ciphertexts.
pub mod homomorphisms;

/// Methods for operating on different ciphertext types.
pub mod ciphertext;

/// Methods for encrypting and decrypting to various ciphertext types.
pub mod encryption;

/// Methods for working with polynomials.
pub mod polynomial;
