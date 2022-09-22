use crate::serialization::WithContext;

use seal_fhe::{
    GaloisKeys, PublicKey as SealPublicKey, RelinearizationKeys, SecretKey as SealSecretKey,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Deserialize, PartialEq, Serialize)]
/**
 * A bundle of public keys. These may be freely shared with other parties without
 * risk of compromising data security.
 *
 * # Remarks
 * In traditional asymmetric cryptography (e.g. RSA, ECC), schemes contain only public
 * and private keys. The public key is used for encryption and the private key is used to
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
    pub public_key: WithContext<SealPublicKey>,

    /**
     * Galois keys are used in BFV and CKKS schemes to rotate Batched vectors.
     *
     * FhePrograms that don't feature rotations have no use for these keys.
     */
    pub galois_key: Option<WithContext<GaloisKeys>>,

    /**
     * Relinearization keys are used in the BFV and CKKS schemes during relinearization
     * operations. Relinearization reduces noise growth and prevents ciphertext size growth
     * resulting from multiplication. Sunscreen automatically inserts relinearization operations,
     * and hence they are an implementation detail.
     *
     * FhePrograms without multiplications don't have relinearizations and thus don't need these keys.
     */
    pub relin_key: Option<WithContext<RelinearizationKeys>>,
}

#[derive(Clone, Deserialize, PartialEq, Serialize)]
/**
 * The private key used to decrypt ciphertexts.
 */
pub struct PrivateKey(pub(crate) WithContext<SealSecretKey>);

#[cfg(test)]
mod tests {
    use super::*;
    use crate::*;
    use seal_fhe::{CoefficientModulus, PlainModulus, SecurityLevel, ToBytes};
    use sunscreen_fhe_program::SchemeType;

    #[test]
    fn can_roundtrip_seal_public_key() {
        let runtime = Runtime::new(&Params {
            lattice_dimension: 8192,
            security_level: SecurityLevel::TC128,
            plain_modulus: 1234,
            scheme_type: SchemeType::Bfv,
            coeff_modulus: CoefficientModulus::bfv_default(8192, SecurityLevel::TC128)
                .unwrap()
                .iter()
                .map(|x| x.value())
                .collect(),
        })
        .unwrap();

        let (public_key, _) = runtime.generate_keys().unwrap();

        let data = bincode::serialize(&public_key.public_key).unwrap();
        let enc_key: WithContext<SealPublicKey> = bincode::deserialize(&data).unwrap();

        let public_2 = PublicKey {
            public_key: enc_key,
            ..public_key
        };

        assert_eq!(
            public_key.public_key.data.as_bytes(),
            public_2.public_key.data.as_bytes()
        );
    }

    #[test]
    fn can_roundtrip_seal_galois_keys() {
        let runtime = Runtime::new(&Params {
            lattice_dimension: 8192,
            security_level: SecurityLevel::TC128,
            plain_modulus: PlainModulus::batching(8192, 20).unwrap().value(),
            scheme_type: SchemeType::Bfv,
            coeff_modulus: CoefficientModulus::bfv_default(8192, SecurityLevel::TC128)
                .unwrap()
                .iter()
                .map(|x| x.value())
                .collect(),
        })
        .unwrap();

        let (public_key, _) = runtime.generate_keys().unwrap();

        let data = bincode::serialize(&public_key.galois_key.as_ref().unwrap()).unwrap();
        let galois_key: WithContext<GaloisKeys> = bincode::deserialize(&data).unwrap();

        let public_2 = PublicKey {
            galois_key: Some(galois_key),
            ..public_key
        };

        assert_eq!(
            public_key.galois_key.unwrap().data.as_bytes(),
            public_2.galois_key.unwrap().data.as_bytes()
        );
    }

    #[test]
    fn can_roundtrip_seal_relin_keys() {
        let runtime = Runtime::new(&Params {
            lattice_dimension: 8192,
            security_level: SecurityLevel::TC128,
            plain_modulus: PlainModulus::batching(8192, 20).unwrap().value(),
            scheme_type: SchemeType::Bfv,
            coeff_modulus: CoefficientModulus::bfv_default(8192, SecurityLevel::TC128)
                .unwrap()
                .iter()
                .map(|x| x.value())
                .collect(),
        })
        .unwrap();

        let (public_key, _) = runtime.generate_keys().unwrap();

        let data = serde_json::to_string(&public_key.relin_key.as_ref().unwrap()).unwrap();
        let relin_keys: WithContext<RelinearizationKeys> = serde_json::from_str(&data).unwrap();

        let public_2 = PublicKey {
            relin_key: Some(relin_keys),
            ..public_key
        };

        assert_eq!(
            public_key.relin_key.unwrap().data.as_bytes(),
            public_2.relin_key.unwrap().data.as_bytes()
        );
    }

    #[test]
    fn can_roundtrip_all_keys() {
        let runtime = Runtime::new(&Params {
            lattice_dimension: 8192,
            security_level: SecurityLevel::TC128,
            plain_modulus: PlainModulus::batching(8192, 20).unwrap().value(),
            scheme_type: SchemeType::Bfv,
            coeff_modulus: CoefficientModulus::bfv_default(8192, SecurityLevel::TC128)
                .unwrap()
                .iter()
                .map(|x| x.value())
                .collect(),
        })
        .unwrap();

        let (public_key, private_key) = runtime.generate_keys().unwrap();

        let data = serde_json::to_string(&public_key).unwrap();
        let public_2: PublicKey = serde_json::from_str(&data).unwrap();

        assert_eq!(
            public_key.relin_key.unwrap().data.as_bytes(),
            public_2.relin_key.unwrap().data.as_bytes()
        );
        assert_eq!(
            public_key.galois_key.unwrap().data.as_bytes(),
            public_2.galois_key.unwrap().data.as_bytes()
        );
        assert_eq!(
            public_key.public_key.data.as_bytes(),
            public_2.public_key.data.as_bytes()
        );

        let data = serde_json::to_string(&private_key).unwrap();
        let private_2: PrivateKey = serde_json::from_str(&data).unwrap();

        assert_eq!(
            private_key.0.as_bytes(),
            private_2.0.as_bytes()
        );
    }
}
