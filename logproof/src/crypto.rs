use ark_ff::{Field, Fp, MontBackend, MontConfig};
use ark_poly::univariate::DensePolynomial;
use digest::Digest;
use sha3::Sha3_256;

/**
 * A trait that allows you to get a collision-resistant hash of an object.
 */
pub trait CryptoHash {
    fn crypto_hash(&self, hasher: &mut Sha3_256);
}

impl<Q, const N: usize> CryptoHash for Fp<MontBackend<Q, N>, N>
where
    Q: MontConfig<N>,
{
    fn crypto_hash(&self, hasher: &mut Sha3_256) {
        // We can just leave the value in Montgomery form.
        for i in self.0 .0 {
            hasher.update(i.to_be_bytes());
        }
    }
}

impl<Q> CryptoHash for DensePolynomial<Q>
where
    Q: Field + CryptoHash,
{
    fn crypto_hash(&self, hasher: &mut Sha3_256) {
        for c in &self.coeffs {
            c.crypto_hash(hasher);
        }
    }
}
