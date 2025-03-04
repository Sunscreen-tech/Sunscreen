use sunscreen_math::Zero;

use crate::{
    dst::AsSlice,
    entities::{LweCiphertextRef, LweSecretKeyRef},
    math::{Torus, TorusOps},
    rand::{normal_torus, uniform_torus},
    LweDef, OverlaySize, PlaintextBits,
};

/// Generate a trivial GLWE encryption. Note that the caller will need to scale
/// the message appropriately; a factor like delta is not automatically applied.
pub fn trivially_encrypt_lwe_ciphertext<S>(
    c: &mut LweCiphertextRef<S>,
    msg: &Torus<S>,
    params: &LweDef,
) where
    S: TorusOps,
{
    params.assert_valid();
    c.assert_is_valid(params.dim);

    let (a, b) = c.a_b_mut(params);

    // tmp = A_i * S_i
    for a_i in a {
        *a_i = Torus::zero();
    }

    // b = m
    *b = *msg;
}

/// Encrypts the given message under sk, writing the ciphertext to ct. Returns the
/// randomness used to generate the ciphertext.
pub fn encrypt_lwe_ciphertext<S>(
    ct: &mut LweCiphertextRef<S>,
    sk: &LweSecretKeyRef<S>,
    msg: Torus<S>,
    params: &LweDef,
) -> Torus<S>
where
    S: TorusOps,
{
    params.assert_valid();

    let (a, b) = ct.a_b_mut(params);
    *b = Torus::zero();

    for (a_i, d_i) in a.iter_mut().zip(sk.as_slice().iter()) {
        *a_i = uniform_torus::<S>();
        *b += *a_i * d_i;
    }

    let e = normal_torus(params.std);
    *b += msg + e;

    e
}

/// Encrypts the given message under sk, writing the ciphertext to ct. Returns the
/// randomness used to generate the ciphertext.
pub fn encode_and_encrypt_lwe_ciphertext<S>(
    ct: &mut LweCiphertextRef<S>,
    sk: &LweSecretKeyRef<S>,
    msg: S,
    params: &LweDef,
    plaintext_bits: PlaintextBits,
) -> Torus<S>
where
    S: TorusOps,
{
    let msg = Torus::<S>::encode(msg, plaintext_bits);

    encrypt_lwe_ciphertext(ct, sk, msg, params)
}

#[cfg(test)]
mod tests {

    use crate::{high_level::*, ops::encryption::encode_and_encrypt_lwe_ciphertext, PlaintextBits};

    #[test]
    fn can_encrypt_decrypt() {
        let params = TEST_LWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_lwe_sk(&params);

        let ct = encryption::encrypt_lwe_secret(4, &sk, &params, bits);
        let pt = encryption::decrypt_lwe(&ct, &sk, &params, bits);

        assert_eq!(pt, 4);
    }

    #[test]
    fn can_reuse_lwe_ciphertext() {
        let params = TEST_LWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_lwe_sk(&params);

        for _ in 0..10 {
            let mut ct = encryption::encrypt_lwe_secret(4, &sk, &params, bits);
            let pt = encryption::decrypt_lwe(&ct, &sk, &params, bits);

            assert_eq!(pt, 4);

            encode_and_encrypt_lwe_ciphertext(&mut ct, &sk, 3, &params, bits);

            assert_eq!(encryption::decrypt_lwe(&ct, &sk, &params, bits), 3);
        }
    }

    #[test]
    fn can_encrypt_decrypt_uniform() {
        let params = TEST_LWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_uniform_lwe_sk(&params);

        let ct = encryption::encrypt_lwe_secret(4, &sk, &params, bits);
        let pt = encryption::decrypt_lwe(&ct, &sk, &params, bits);

        assert_eq!(pt, 4);
    }

    #[test]
    fn can_trivially_decrypt() {
        let params = TEST_LWE_DEF_1;
        let bits = PlaintextBits(4);

        let sk = keygen::generate_binary_lwe_sk(&params);

        let ct = encryption::trivial_lwe(4, &params, bits);
        let pt = encryption::decrypt_lwe(&ct, &sk, &params, bits);

        assert_eq!(pt, 4);
    }
}
