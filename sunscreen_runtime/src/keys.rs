//use crate::Params;
use seal::{GaloisKeys, PublicKey as SealPublicKey, RelinearizationKeys};
//use serde::{Deserialize, Serialize, ser::Serializer};

#[derive(Clone)]
/**
 * TODO
 */
pub struct PublicEncryptionKey {
//    params: Params, 

//    key: SealPublicKey,
}

/*
impl Serialize for PublicEncryptionKey {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer
    {
    }
}*/

#[derive(Clone)]
/**
 * A bundle of public keys. These may be freely shared with other parties without
 * risk of compromising data security.
 *
 * # Remarks
 * In traditional asymmetric cryptography (e.g. RSA, ECC), schemes contain only public
 * and secret keys. The public key is used for encryption and the secret key is used to
 * decrypt data.
 *
 * In addition to the tradtional public key, homomorphic cryptographic schemes may have
 * additional keys to facilitate certain homomorphic operations. These keys are "public"
 * in the sense that they may be freely shared without compromising data privacy, but
 * they are generally used for operations other than encryption. For example,
 * [`RelinearizationKeys`] are used in the BFV and CKKS schemes to reduce noise growth
 * and prevent ciphertext size growth after multiplication.
 */
pub struct PublicKey {
    /**
     * The public key used for encryption operations.
     */
    pub public_key: SealPublicKey,

    /**
     * Galois keys are used in BFV and CKKS schemes to rotate SIMD vectors.
     *
     * Circuits that don't feature rotations have no use for these keys.
     */
    pub galois_key: Option<GaloisKeys>,

    /**
     * Relinearization keys are used in the BFV and CKKS schemes during relinearization
     * operations. Relinearization reduces noise growth and prevents ciphertext size growth
     * resulting from multiplication. Sunscreen automatically inserts relinearization operations,
     * and hence they are an implementation detail.
     *
     * Circuits without multiplications don't have relinearizations and thus don't need these keys.
     */
    pub relin_key: Option<RelinearizationKeys>,
}
