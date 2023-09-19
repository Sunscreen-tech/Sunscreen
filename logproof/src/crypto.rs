use digest::Digest;
use sha3::Sha3_256;
use sunscreen_math::{
    poly::Polynomial,
    ring::{ArithmeticBackend, Ring, WrappingSemantics, ZInt, Zq},
};
use zerocopy::AsBytes;

/**
 * A trait that allows you to get a collision-resistant hash of an object.
 */
pub trait CryptoHash {
    /**
     * Compute a SHA-3 hash of this object.
     */
    fn crypto_hash(&self, hasher: &mut Sha3_256);
}

impl<B, const N: usize> CryptoHash for Zq<N, B>
where
    B: ArithmeticBackend<N>,
{
    fn crypto_hash(&self, hasher: &mut Sha3_256) {
        // We can just leave the value in Montgomery form.
        for i in self.val.as_words() {
            hasher.update(&i.to_be_bytes());
        }
    }
}

impl<T> CryptoHash for ZInt<T>
where
    T: WrappingSemantics,
{
    fn crypto_hash(&self, hasher: &mut Sha3_256) {
        hasher.update(self.as_bytes());
    }
}

impl<R> CryptoHash for Polynomial<R>
where
    R: Ring + CryptoHash,
{
    fn crypto_hash(&self, hasher: &mut Sha3_256) {
        for c in &self.coeffs {
            c.crypto_hash(hasher);
        }
    }
}
