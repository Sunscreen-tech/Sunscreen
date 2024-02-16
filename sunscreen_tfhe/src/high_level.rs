#![allow(dead_code)]

use crate::{
    rand::Stddev, GlweDef, GlweDimension, GlweSize, LweDef, LweDimension, PolynomialDegree,
    RadixCount, RadixDecomposition, RadixLog,
};

#[doc(hidden)]
pub const TEST_RADIX: RadixDecomposition = RadixDecomposition {
    count: RadixCount(3),
    radix_log: RadixLog(4),
};

#[doc(hidden)]
pub const TEST_GLWE_DEF_1: GlweDef = GlweDef {
    dim: GlweDimension {
        polynomial_degree: PolynomialDegree(128),
        size: GlweSize(2),
    },
    std: Stddev(1e-16),
};

#[doc(hidden)]
pub const TEST_GLWE_DEF_2: GlweDef = GlweDef {
    dim: GlweDimension {
        polynomial_degree: PolynomialDegree(256),
        size: GlweSize(3),
    },
    std: Stddev(1e-16),
};

#[doc(hidden)]
pub const TEST_LWE_DEF_1: LweDef = LweDef {
    dim: LweDimension(128),
    std: Stddev(1e-16),
};

#[doc(hidden)]
pub const TEST_LWE_DEF_2: LweDef = LweDef {
    dim: LweDimension(256),
    std: Stddev(1e-16),
};

#[doc(hidden)]
pub const TEST_LWE_DEF_3: LweDef = LweDef {
    dim: LweDimension(128),
    std: Stddev(0.0),
};

/// TFHE functionality related to key generation.
pub mod keygen {
    use crate::{
        entities::{
            BootstrapKey, CircuitBootstrappingKeyswitchKeys, GlweSecretKey, GlweSecretKeyRef,
            LweKeyswitchKey, LwePublicKey, LweSecretKey, LweSecretKeyRef,
        },
        ops::{
            bootstrapping::generate_bootstrap_key,
            keyswitch::{
                lwe_keyswitch_key::generate_keyswitch_key_lwe,
                private_functional_keyswitch::generate_circuit_bootstrapping_pfks_keys,
            },
        },
        GlweDef, LweDef, RadixDecomposition,
    };

    /// Generate a new binary [`LweSecretKey`] under the given LWE parameters.
    ///
    /// # Remarks
    /// Any functions that use this key will need the same [`LweDef`].
    ///
    /// These keys may be used to create bootstrapping keys.
    ///
    /// # Panics
    /// If [`LweDef`] is invalid.
    ///
    /// # Security
    /// These keys are *not* secure under some threshold cryptography settings.
    /// Under those settings, you should use [`generate_uniform_lwe_sk`].
    ///
    /// This key is secret and care should be taken as to which parties
    /// possess it. Anyone who possesses the returned [`LweSecretKey`]
    /// can decrypt any messages encrypted under it.
    pub fn generate_binary_lwe_sk(params: &LweDef) -> LweSecretKey<u64> {
        LweSecretKey::generate_binary(params)
    }

    /// Generate a new binary [`LweSecretKey`] under the given LWE parameters.
    ///
    /// # Remarks
    /// Any functions that use this key will need the same [`LweDef`].
    ///
    /// These keys may *not* directly be used to create bootstrapping keys.
    /// However, in threshold schemes that use them, usually you derive
    /// a binary key from uniform key shares.
    ///
    /// # Panics
    /// If [`LweDef`] is invalid.
    ///
    /// # Security
    /// This key is secret and care should be taken as to which parties
    /// possess it. Anyone who possesses the returned [`LweSecretKey`]
    /// can decrypt any messages encrypted under it.
    pub fn generate_uniform_lwe_sk(params: &LweDef) -> LweSecretKey<u64> {
        LweSecretKey::generate_uniform(params)
    }

    /// Generate a new [`LwePublicKey`] under the given parameters. This
    /// public key is paired with `sk` - that is messages encrypted under
    /// this public key can be decrypted with `sk`.
    ///
    /// # Remarks
    /// Any functions that use this key will need to use the same `params`.
    ///
    /// # Panics
    /// If `params` is invalid
    /// If `params` doesn't correspond with `sk`.
    ///
    /// # Security
    /// This key is public and sharing it does not compromise semantic
    /// security.
    pub fn generate_lwe_pk(sk: &LweSecretKeyRef<u64>, params: &LweDef) -> LwePublicKey<u64> {
        LwePublicKey::generate(sk, params)
    }

    /// Generate a new GLWE secret key under the given GLWE parameters.
    /// The key will consist of {0,1}-valued coefficients.
    ///
    /// # Remarks
    /// Any functions that use this key will need the same [`GlweDef`].
    ///
    /// # Panics
    /// If [`GlweDef`] is invalid.
    ///
    /// # Security
    /// Binary [GlweSecretKey]s are insecure in some threshold cryptography
    /// settings. Under those settings, you should use
    /// [`generate_uniform_glwe_sk`].
    ///
    /// This key is secret and care should be taken as to which parties
    /// possess it. Anyone who possesses the returned [`GlweSecretKey`]
    /// can decrypt any messages encrypted under it.
    pub fn generate_binary_glwe_sk(params: &GlweDef) -> GlweSecretKey<u64> {
        GlweSecretKey::generate_binary(params)
    }

    /// Generate a new GLWE secret key under the given GLWE parameters.
    /// The key will consist of uniform coefficients over the Torus's
    /// isomorphic ring.
    ///
    /// # Remarks
    /// Any functions that use this key will need the same [`GlweDef`].
    ///
    /// This is used over binary in threshold cryptography settings.
    ///
    /// # Panics
    /// If [`GlweDef`] is invalid.
    ///
    /// # Security
    /// This key is secret and care should be taken as to which parties
    /// possess it. Anyone who possesses the returned [`GlweSecretKey`]
    /// can decrypt any messages encrypted under it.
    pub fn generate_uniform_glwe_sk(params: &GlweDef) -> GlweSecretKey<u64> {
        GlweSecretKey::generate_uniform(params)
    }

    /// Generate a new bootstrapping key, which is used in bootstrapping operations.
    ///
    /// See also [`programmable_bootstrap`](super::evaluation::programmable_bootstrap)
    /// and [`circuit_bootstrap`](super::evaluation::circuit_bootstrap).
    ///
    /// # Remarks
    /// A bootstrapping key is an encryption of an LWE secret key under a different
    /// GLWE secret key reinterpreted as an LWE key.
    ///
    /// `lwe` and `glwe` are the LWE and GLWE parameters used when you generated the
    /// [`LweSecretKey`] and [`GlweSecretKey`], respectively.
    ///
    /// `radix` specifies the decomposition to use during bootstrapping.
    ///
    /// You should use the same `lwe`, `glwe`, `radix` values here as when you call
    /// [`programmable_bootstrap`](super::evaluation::programmable_bootstrap).
    ///
    /// The returned bootstrapping key is not immediately useful outside of serialization.
    /// You need to FFT transform is first (see [fft_bootstrap_key](super::fft::fft_bootstrap_key)).
    ///
    /// ## Circuit bootstrapping
    /// When using [`circuit_bootstrap`](super::evaluation::circuit_bootstrap), `pbs_radix`
    /// must match this `radix`, `lwe_0` must match `lwe`, and `glwe_2` must match `glwe`.
    ///
    /// # Panics
    /// If `lwe`, `glwe`, or `radix` are invalid.
    /// If `glwe_key` isn't valid under `glwe`.
    /// If `sk` isn't valid under `lwe`.
    ///
    /// # Security
    /// The returned key is public and does not compromise semantic security.
    /// However, anyone who possesses `glwe_key` can easily use the returned
    /// [`BootstrapKey`] to recover `sk`.
    pub fn generate_bootstrapping_key(
        sk: &LweSecretKey<u64>,
        glwe_key: &GlweSecretKey<u64>,
        lwe: &LweDef,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> BootstrapKey<u64> {
        let mut bsk = BootstrapKey::new(lwe, glwe, radix);

        generate_bootstrap_key(&mut bsk, sk, glwe_key, glwe, radix);

        bsk
    }

    /// Generate an LWE keyswitch key. LWE keyswitching allows you take an encryption of `m`
    /// under [LWESecretKey](crate::entities::LweSecretKey) `from_sk` and turn it into an
    /// encryption of `m` under `to_sk`.
    ///
    /// # Remarks
    /// `from_lwe` and `to_lwe` are the parameters under which you generated `from_sk` and
    /// `to_sk`, respectively.
    ///
    /// `radix` specifies the decomposition to use during LWE keyswitching.
    ///
    /// TODO: mention keyswitch operation.
    ///
    /// # Panics
    /// If the `from_lwe` parameters aren't valid for `from_sk`.
    /// If the `to_lwe` parameters aren't valid for `to_sk`.
    /// If `from_lwe`, `to_lwe`, or `radix` parameters are invalid.
    ///
    /// # Security
    /// The returned key is public and sharing it does not compromise semantic
    /// security. However, anyone who possesses `to_lwe` will effectively
    /// be able to decrypt any message encrypted under `from_lwe` with the
    /// returned [`LweKeyswitchKey`].
    pub fn generate_ksk(
        from_sk: &LweSecretKeyRef<u64>,
        to_sk: &LweSecretKeyRef<u64>,
        from_lwe: &LweDef,
        to_lwe: &LweDef,
        radix: &RadixDecomposition,
    ) -> LweKeyswitchKey<u64> {
        let mut ksk = LweKeyswitchKey::new(from_lwe, to_lwe, radix);

        generate_keyswitch_key_lwe(&mut ksk, from_sk, to_sk, to_lwe, radix);

        ksk
    }

    /// Generate a set of [`CircuitBootstrappingKeyswitchKeys`] to use during
    /// [circuit_bootstrap](super::evaluation::circuit_bootstrap) operations.
    ///
    /// # Remarks
    /// Internally, [`CircuitBootstrappingKeyswitchKeys`] is a list of
    /// [`PrivateFunctionalKeyswitchKey`](crate::entities::PrivateFunctionalKeyswitchKey)s.
    ///
    /// During [circuit_bootstrap](super::evaluation::circuit_bootstrap) operations,
    /// these keys are used to convert [`LweCiphertext`](crate::entities::LweCiphertext)s
    /// encrypted under `from_sk` into [`GlweCiphertext`](crate::entities::GlweCiphertext)s
    /// encrypted under `to_sk`. These [`GlweCiphertext`](crate::entities::GlweCiphertext)s
    /// together form a [`GgswCiphertext`](crate::entities::GgswCiphertext).
    ///
    /// The `from_lwe` and `to_glwe` parameters correspond to those used when you generated
    /// `from_sk` and `to_sk`, respectively.
    ///
    /// The `radix` parameter describes the [`RadixDecomposition`] to use during the private
    /// functional keyswitch operation. When performing a
    /// [circuit_bootstrap](super::evaluation::circuit_bootstrap), these same parameters should
    /// be passed as `pfks_radix`.
    ///
    /// # Panics
    /// If `from_lwe`, `to_glwe`, or `radix` are invalid.
    /// If `from_lwe` or `to_glwe` parameters don't correspond with `to_sk` or `to_glwe`, respectively.
    ///
    /// # Security
    /// The returned [`CircuitBootstrappingKeyswitchKeys`] are public and
    /// don't in of themselves compromise semantic security. However,
    /// anyone who possesses `to_sk` can easily recover `from_sk` using this
    /// information.
    pub fn generate_cbs_ksk(
        from_sk: &LweSecretKeyRef<u64>,
        to_sk: &GlweSecretKeyRef<u64>,
        from_lwe: &LweDef,
        to_glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> CircuitBootstrappingKeyswitchKeys<u64> {
        let mut cbs_ksk = CircuitBootstrappingKeyswitchKeys::new(from_lwe, to_glwe, radix);

        generate_circuit_bootstrapping_pfks_keys(
            &mut cbs_ksk,
            from_sk,
            to_sk,
            from_lwe,
            to_glwe,
            radix,
        );

        cbs_ksk
    }
}

/// TFHE functionality related to encryption.
pub mod encryption {
    use crate::{
        entities::{
            GgswCiphertext, GgswCiphertextRef, GlweCiphertext, GlweCiphertextRef, GlweSecretKeyRef,
            LweCiphertext, LweCiphertextRef, LwePublicKeyRef, LweSecretKeyRef, Polynomial,
            PolynomialRef, TlwePublicEncRandomness,
        },
        ops::encryption::{encrypt_ggsw_ciphertext_scalar, trivially_encrypt_lwe_ciphertext},
        CarryBits, GlweDef, LweDef, PlaintextBits, RadixDecomposition, Torus,
    };

    /// Create an [`LweCiphertext`] encryption of `val` under
    /// [LweSecretKey](crate::entities::LweSecretKey) `sk`.
    ///
    /// # Remarks
    /// Use [`generate_binary_lwe_sk`](super::keygen::generate_binary_lwe_sk) to
    /// generate an [`LweSecretKey`](crate::entities::LweSecretKey).
    ///
    /// `params` should be the same parameters used when generating the secret key.
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`]
    /// will contain the message. `val` should not exceed `2^plaintext_bits.0`.
    ///
    /// # Panics
    /// If `params` is invalid.
    /// If `params` don't correspond with `sk`.
    pub fn encrypt_lwe_secret(
        val: u64,
        sk: &LweSecretKeyRef<u64>,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> LweCiphertext<u64> {
        sk.encrypt(val, params, plaintext_bits).0
    }

    /// Create a tuple containing an [`LweCiphertext`] encryption of `val`
    /// under [LweSecretKey](crate::entities::LweSecretKey) `sk` and the
    /// randomness used to generate it.
    ///
    /// This randomness can be used to produce zero-knowledge proofs.
    ///
    /// # Remarks
    /// Use [`generate_binary_lwe_sk`](super::keygen::generate_binary_lwe_sk)
    /// to generate an [`LweSecretKey`](crate::entities::LweSecretKey).
    ///
    /// `params` should be the same parameters used when generating the secret key.
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`]
    /// will contain the message. `val` should not exceed `2^plaintext_bits.0`.
    ///
    /// # Panics
    /// If `params` is invalid.
    /// If `params` don't correspond with `sk`.
    ///
    /// # Security
    /// Revealing the returned randomness compromises the confidentiality
    /// of the returned [`LweCiphertext`].
    pub fn encrypt_lwe_secret_and_return_randomness(
        val: u64,
        sk: &LweSecretKeyRef<u64>,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> (LweCiphertext<u64>, Torus<u64>) {
        sk.encrypt(val, params, plaintext_bits)
    }

    /// Create an [LweCiphertext] encryption of `val` under the secret
    /// key that pairs with `pk`.
    ///
    /// This function uses the [`LwePublicKey`](crate::entities::LwePublicKey),
    /// which may be freely distributed without compromising security.
    ///
    /// # Remarks
    /// Use [`generate_lwe_pk`](super::keygen::generate_lwe_pk) to generate
    /// a [`LwePublicKey`](crate::entities::LwePublicKey).
    ///
    /// # Panics
    /// If `params` is invalid.
    /// If `params` doesn't correspond with `pk`.
    pub fn encrypt_lwe(
        val: u64,
        pk: &LwePublicKeyRef<u64>,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> LweCiphertext<u64> {
        pk.encrypt(val, params, plaintext_bits).0
    }

    /// Create a tuple containing an [`LweCiphertext`] encryption of `val`
    /// under the [LweSecretKey](crate::entities::LweSecretKey) paired with
    /// `pk` and the randomness used to generate it.
    ///
    /// This randomness can be used to produce zero-knowledge proofs.
    ///
    /// # Remarks
    /// Use [`generate_binary_lwe_sk`](super::keygen::generate_binary_lwe_sk)
    /// to generate an [`LweSecretKey`](crate::entities::LweSecretKey).
    ///
    /// `params` should be the same parameters used when generating the secret key.
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`]
    /// will contain the message. `val` should not exceed `2^plaintext_bits.0`.
    ///
    /// # Panics
    /// If `params` is invalid.
    /// If `params` don't correspond with `pk`.
    ///
    /// # Security
    /// Revealing the returned randomness compromises the confidentiality
    /// of the returned [`LweCiphertext`].
    pub fn encrypt_lwe_and_return_randomness(
        val: u64,
        pk: &LwePublicKeyRef<u64>,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> (LweCiphertext<u64>, TlwePublicEncRandomness<u64>) {
        pk.encrypt(val, params, plaintext_bits)
    }

    /// Create a [`GlweCiphertext`] encryption of `pt` under `sk`.
    ///
    /// # Remarks
    /// `params` should be a same as those used when creating `sk`.
    /// `pt.len()` should equal `sk.dim.polynomial_degree.0`.
    ///
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`]
    /// polynomial coefficients will contain the message. No coefficient in
    /// `pt` should exceed `2^plaintext_bits.0`.
    ///
    /// # Panics
    /// If `params` is invalid.
    /// If `params` doesn't correspond with `sk`
    /// If `pt` doesn't have the same number of coefficients as
    /// `params.dim.polynomial_degree.0`.
    pub fn encrypt_glwe(
        pt: &PolynomialRef<u64>,
        sk: &GlweSecretKeyRef<u64>,
        params: &GlweDef,
        plaintext_bits: PlaintextBits,
    ) -> GlweCiphertext<u64> {
        sk.encode_encrypt_glwe(pt, params, plaintext_bits)
    }

    /// Create a trivial LWE encryption. Trivial encryptions have no noise and are thus
    /// insecure. However, they are useful for creating public constants in TFHE computations.
    ///
    /// Trivial encryptions are valid encryptions of `val` under *every* LWE secret key
    /// using the same `params`.
    ///
    /// # Remarks
    /// `params` are the parameters under which to create this encryption. Note that homomorphic
    /// operations require every operand use the same [`LweDef`] parameters.
    ///
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`]
    /// will contain the message. `val` should not exceed `2^plaintext_bits.0`. Truncation
    /// of `val`'s most-significant bits will occur otherwise.
    ///
    /// # Panics
    /// If `plaintext_bits > 63`.
    /// If `params` are invalid.
    ///
    /// # Security
    /// Trivial encryptions provide no cryptographic security.
    pub fn trivial_lwe(
        val: u64,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> LweCiphertext<u64> {
        let mut ct = LweCiphertext::new(params);

        trivially_encrypt_lwe_ciphertext(&mut ct, &Torus::encode(val, plaintext_bits), params);

        ct
    }

    /// Decrypt [LweCiphertext] `ct` encrypted under [LweSecretKey](crate::entities::LweSecretKey)
    /// `sk`. Decode this decrypted value and return it.
    ///
    /// # Remarks
    /// `params` must correspond with `ct` and `sk`.
    ///
    /// If a different `sk` is used than the one that produced `ct`, the result will be
    /// garbage.
    ///
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`]
    /// will contain the message. `val` will not exceed `2^plaintext_bits.0`. Generally,
    /// you should use the same `plaintext_bits` that were used during encryption.
    ///
    /// # Panics
    /// If `params` doesn't correspond with either `ct` or `sk`.
    /// If `params` is invalid.
    pub fn decrypt_lwe(
        ct: &LweCiphertextRef<u64>,
        sk: &LweSecretKeyRef<u64>,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
    ) -> u64 {
        sk.decrypt(ct, params, plaintext_bits)
    }

    /// Decrypt [LweCiphertext] `ct` encrypted under [LweSecretKey](crate::entities::LweSecretKey)
    /// `sk` and decode it, handling carry bits.
    ///
    /// # Remarks
    /// `params` must correspond with `ct` and `sk`.
    ///
    /// If a different `sk` is used than the one that produced `ct`, the result will be
    /// garbage.
    ///
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`]
    /// will contain the message. `val` will not exceed `2^plaintext_bits.0`. Generally,
    /// you should use the same `plaintext_bits` that were used during encryption.
    ///
    /// `carry_bits` describes how many of the most-significant bits of the
    /// [`Torus`] will contain the carry.
    ///
    /// # Panics
    /// If `params` doesn't correspond with either `ct` or `sk`.
    /// If `params` is invalid.
    pub fn decrypt_lwe_with_carry(
        ct: &LweCiphertextRef<u64>,
        sk: &LweSecretKeyRef<u64>,
        params: &LweDef,
        plaintext_bits: PlaintextBits,
        carry_bits: CarryBits,
    ) -> u64 {
        let decrypted = sk.decrypt_without_decode(ct, params);

        // We manually decode here because the padding bit.
        let plain_bits = plaintext_bits;

        let round_bit = decrypted
            .inner()
            .wrapping_shr(64 - plain_bits.0 - carry_bits.0 - 1)
            & 0x1;
        let mask = (0x1 << plain_bits.0) - 1;

        (decrypted
            .inner()
            .wrapping_shr(64 - plain_bits.0 - carry_bits.0)
            + round_bit)
            & mask
    }

    /// Decrypt [GlweCiphertext] `ct` encrypted under [GlweSecretKey](crate::entities::GlweSecretKey)
    /// `sk`. Decode this decrypted value and return it.
    ///
    /// # Remarks
    /// `params` must correspond with `ct` and `sk`.
    ///
    /// If a different `sk` is used than the one that produced `ct`, the result will be
    /// garbage.
    ///
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`] polynomial's
    /// coefficients contain the message. `val` will not exceed `2^plaintext_bits.0`. Generally,
    /// you should use the same `plaintext_bits` that were used during encryption.
    ///
    /// # Panics
    /// If `params` doesn't correspond with either `ct` or `sk`.
    /// If `params` is invalid.
    pub fn decrypt_glwe(
        ct: &GlweCiphertextRef<u64>,
        sk: &GlweSecretKeyRef<u64>,
        params: &GlweDef,
        plaintext_bits: PlaintextBits,
    ) -> Polynomial<u64> {
        sk.decrypt_decode_glwe(ct, params, plaintext_bits)
    }

    /// Create a trivial encryption of `pt` as a [GlweCiphertext]. Trivial encryptions contain
    /// no noise and are thus insecure. However, they are useful as public constants in
    /// a TFHE computation.
    ///
    /// # Remarks
    /// Trivial encryption are valid under *every* [GlweSecretKey](crate::entities::GlweSecretKey)
    /// using `params`. Note that homomorphic operations require every operand to use the same
    /// `params` and secret key.
    ///
    /// `plaintext_bits` describes how many of the most-significant bits of the [`Torus`]
    /// polynomial coefficients will contain the message. `val` should not exceed
    /// `2^plaintext_bits.0`. Truncation of `val`'s most-significant bits will occur otherwise.
    ///
    /// # Panics
    /// If `params` are invalid.
    /// If `plaintext_bits >= 64`.
    ///
    /// # Security
    /// Trivial encryptions provide no cryptographic security.
    pub fn trivial_glwe(
        pt: &PolynomialRef<u64>,
        params: &GlweDef,
        plaintext_bits: PlaintextBits,
    ) -> GlweCiphertext<u64> {
        let mut result = GlweCiphertext::new(params);

        for (b_out, b_in) in result
            .b_mut(params)
            .coeffs_mut()
            .iter_mut()
            .zip(pt.coeffs().iter())
        {
            *b_out = Torus::encode(*b_in, plaintext_bits);
        }

        result
    }

    /// Create a [`GgswCiphertext`] encrypting `msg` under
    /// [GlweSecretKey](crate::entities::GlweSecretKey) `sk`.
    ///
    /// # Remarks
    /// This encrypts `msg` as a constant coefficient polynomial. While [`GgswCiphertext`]s
    /// theoretically support encrypting arbitrary polynomial messages, such ciphertexts have
    /// no known uses in TFHE.
    ///
    /// Typically, you'll want to set `plaintext_bits` to 1 and encrypt a binary
    /// `msg`. This allows you to use the [`GgswCiphertext`] as the select input to
    /// a [`cmux`](super::evaluation::cmux) operation.
    ///
    /// `params` should match those under which you generated `sk`.
    ///
    /// `radix` defines how many decompositions to include in the result. Subsequent
    /// [`cmux`](super::evaluation::cmux) operations using this result must use the
    /// same `radix`.
    ///
    /// [`GgswCiphertext`]s are not immediate useful outside of serialization. You must
    /// first take its Fourier transform using [`fft_ggsw`](super::fft::fft_ggsw) before
    /// using it in a [`cmux`](super::evaluation::cmux) operation.
    ///
    /// # Panics
    /// If `params` or `radix` are invalid.
    /// If `params` doesn't correspond to `sk`.
    /// If `plaintext_bits >= 64`.
    pub fn encrypt_ggsw(
        msg: u64,
        sk: &GlweSecretKeyRef<u64>,
        params: &GlweDef,
        radix: &RadixDecomposition,
        plaintext_bits: PlaintextBits,
    ) -> GgswCiphertext<u64> {
        let mut result = GgswCiphertext::new(params, radix);

        encrypt_ggsw_ciphertext_scalar(&mut result, msg, sk, params, radix, plaintext_bits);

        result
    }

    /// Decrypt a [`GgswCiphertext`] encrypted under `sk`.
    /// Since GGSW ciphertexts generally contain binary, you should
    /// usually set `plaintext_bits` to 1.
    ///
    /// # Remarks
    /// `params` should correspond with `ct` and `sk`.
    /// `radix` should correspond with `ct`.
    ///
    /// # Panics
    /// If `params` or `radix` are invalid.
    /// If `params` or `radix` don't correspond to `ct`
    /// If `params` don't correspond to `sk`.
    pub fn decrypt_ggsw(
        ct: &GgswCiphertextRef<u64>,
        sk: &GlweSecretKeyRef<u64>,
        params: &GlweDef,
        radix: &RadixDecomposition,
        _plaintext_bits: PlaintextBits,
    ) -> Polynomial<u64> {
        let mut msg = Polynomial::zero(params.dim.polynomial_degree.0);

        crate::ops::encryption::decrypt_ggsw_ciphertext(&mut msg, ct, sk, params, radix);

        msg.map(|x| x.inner())
    }
}

/// Operations for producing Fourier-transformed versions of entities.
pub mod fft {
    use num::Complex;

    use crate::{
        entities::{
            BootstrapKeyFft, BootstrapKeyRef, GgswCiphertextFft, GgswCiphertextRef,
            GlweCiphertextFft, GlweCiphertextRef,
        },
        GlweDef, LweDef, RadixDecomposition,
    };

    /// Take the fourier transform of a [`GlweCiphertext`](crate::entities::GlweCiphertext).
    ///
    /// # Remarks
    /// `params` must be the same parameters that produce `ct`.
    ///
    /// # Panics
    /// `params` is invalid.
    /// `params` doesn't correspond with `ct`.
    pub fn fft_glwe(
        ct: &GlweCiphertextRef<u64>,
        params: &GlweDef,
    ) -> GlweCiphertextFft<Complex<f64>> {
        let mut fft = GlweCiphertextFft::new(params);

        ct.fft(&mut fft, params);

        fft
    }

    /// Take the fourier transform of a [`GgswCiphertext`](crate::entities::GgswCiphertext).
    ///
    /// # Remarks
    /// `glwe` and `radix` must be the same parameters that produced `ggsw`.
    ///
    /// For [`GgswCiphertext`](crate::entities::GgswCiphertext)s that result from a
    /// [`circuit_bootstrap`](super::evaluation::circuit_bootstrap) operation, these
    /// must match `glwe_1` and `cbs_radix` respectively.
    ///
    /// # Panics
    /// If `glwe` and `radix` don't correspond with `ggsw`.
    /// If `glwe` or `radix` are invalid.
    pub fn fft_ggsw(
        ggsw: &GgswCiphertextRef<u64>,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GgswCiphertextFft<Complex<f64>> {
        let mut fft = GgswCiphertextFft::new(glwe, radix);

        ggsw.fft(&mut fft, glwe, radix);

        fft
    }

    /// Take the fourier transform of a [BootstrapKey](crate::entities::BootstrapKey).
    /// The resulting [`BootstrapKeyFft`] may be used in
    /// [`programmable_bootstrap`](super::evaluation::programmable_bootstrap) and
    /// [`circuit_bootstrap`](super::evaluation::circuit_bootstrap) operations.
    ///
    /// # Remarks
    /// `glwe` and `radix` must be the same parameters that produced `bsk`.
    ///
    /// # Panics
    /// If `glwe` and `radix` don't correspond with `bsk`.
    /// If `glwe` or `radix` are invalid.
    pub fn fft_bootstrap_key(
        bsk: &BootstrapKeyRef<u64>,
        lwe: &LweDef,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> BootstrapKeyFft<Complex<f64>> {
        let mut bsk_fft = BootstrapKeyFft::new(lwe, glwe, radix);

        bsk.fft(&mut bsk_fft, glwe, radix);

        bsk_fft
    }
}

/// TFHE operations for performing computation.
pub mod evaluation {
    use num::Complex;

    use crate::{
        entities::{
            BootstrapKeyFft, BootstrapKeyFftRef, CircuitBootstrappingKeyswitchKeysRef,
            GgswCiphertext, GgswCiphertextFftRef, GlweCiphertext, GlweCiphertextRef, LweCiphertext,
            LweCiphertextRef, LweKeyswitchKeyRef, UnivariateLookupTableRef,
        },
        GlweDef, LweDef, RadixDecomposition,
    };

    /// Perform a multiplexing operation. When `b_fft` encrypts a zero polynomial,
    /// the resulting [`GlweCiphertext`] will the same message as `d_0`. When `b_fft`
    /// encrypts the 1 polynomial, the result will contain the same message as `d_1`.
    ///
    /// # Remarks
    /// `b_fft`, `d_0`, and `d_1` must all be encrypted under the same
    /// [`GlweSecretKey`](crate::entities::GlweSecretKey). This implies `params` must
    /// correspond with all three values.
    ///
    /// Additionally, `radix` must correspond to `b_fft`.
    ///
    /// For
    /// [`GgswCiphertext`] resulting from [`circuit_bootstrap`] operations,
    /// `radix` must be the same as `cbs_radix` and `params` must be the same as
    /// `glwe_1`.
    ///
    /// # Panics
    /// If `params` doesn't correspond with `b_fft`, `d_0`, `d_1`.
    /// If `radix` doesn't correspond with `b_fft`.
    /// If `radix` or `params` are invalid.
    pub fn cmux(
        b_fft: &GgswCiphertextFftRef<Complex<f64>>,
        d_0: &GlweCiphertextRef<u64>,
        d_1: &GlweCiphertextRef<u64>,
        params: &GlweDef,
        radix: &RadixDecomposition,
    ) -> GlweCiphertext<u64> {
        let mut result = GlweCiphertext::new(params);

        crate::ops::fft_ops::cmux(&mut result, d_0, d_1, b_fft, params, radix);

        result
    }

    #[allow(clippy::too_many_arguments)]
    /// Perform a programmable bootstrapping operation. Bootstrapping takes
    /// `input` and produces a new ciphertext with a fixed noise level, applying
    /// a univariate function defined by `lut` in the process.
    ///
    /// This new ciphertext is encrypted under a (usually) different
    /// [`LweSecretKey`](crate::entities::LweSecretKey) defined by `glwe` interpreted
    /// as an [`LweDef`].
    ///
    /// See also [`UnivariateLookupTable`](crate::entities::UnivariateLookupTable).
    ///
    /// To switch the message back to the original key, you need to perform an LWE
    /// keyswitch operation. TODO: hotlink
    ///
    /// # Remarks
    /// `input` must be valid under the `lwe` parameters.
    /// `lwe`, `glwe`, and `radix` parameters must be the same as those used when
    /// first creating the `bsk`.
    /// `lut` must be valid under `glwe` parameters.
    ///
    /// # Panics
    /// If `lwe`, `glwe`, or `radix` parameters are invalid.
    /// If `input` doesn't correspond to `lwe` parameters.
    /// If `bsk` doesn't correspond to `lwe`, `glwe`, `radix` parameters.
    /// If `lut` doesn't correspond to `glwe` parameters.
    pub fn univariate_programmable_bootstrap(
        input: &LweCiphertextRef<u64>,
        lut: &UnivariateLookupTableRef<u64>,
        bsk: &BootstrapKeyFft<Complex<f64>>,
        lwe: &LweDef,
        glwe: &GlweDef,
        radix: &RadixDecomposition,
    ) -> LweCiphertext<u64> {
        let mut out = LweCiphertext::new(&glwe.as_lwe_def());

        crate::ops::bootstrapping::programmable_bootstrap(
            &mut out, input, lut, bsk, lwe, glwe, radix,
        );

        out
    }

    #[allow(clippy::too_many_arguments)]
    /// Perform a circuit bootstrapping operation. Circuit bootstrapping takes
    /// `input` [LweCiphertext] encrypted under a [LweSecretKey](crate::entities::LweSecretKey)
    /// constructed with `lwe_0` parameters and produces a [GgswCiphertext] encrypted
    /// under a [GlweSecretKey](crate::entities::GlweSecretKey) constructed with `glwe_1`
    /// parameters.
    ///
    /// See also [generate_bootstrapping_key](super::keygen::generate_bootstrapping_key) and
    /// [generate_cbs_pfks](super::keygen::generate_cbs_ksk) for how to generate the required
    /// keys.
    ///
    /// # Remarks
    /// Internally, circuit bootstrapping occurs in 2 steps. First we perform programmable
    /// bootstraps (PBS) from `lwe_0` parameters to `glwe_2` reinterpreted as LWE parameters. We
    /// do this `cbs_radix.count` times using univariate functions that map the message in
    /// input to its corresponding radix decomposition.
    ///
    /// For step 2, we use private functional keyswitching (PFKS) to transform the
    /// `cbs_radix.count` [LweCiphertext]s encrypted under `glwe_2` into
    /// `cbs_radix.count * glwe_2.size + 1` [GlweCiphertext]s. The PFKS operations multiply each
    /// [GlevCiphertext](crate::entities::GlevCiphertext) by the corresponding polynomial in
    /// the `glwe_1` [GlweSecretKey](crate::entities::GlweSecretKey) to create a valid
    /// [GgswCiphertext].
    ///
    /// To summarize, we use PBS to turn an `lwe_0` LWE ciphertext into `glwe_2` LWE ciphertexts.
    /// We then use PFKS to turn the `glwe_2` LWE ciphertexts into `glwe_1` GLWE ciphertexts
    /// arranged as a valid [GgswCiphertext] encrypting the same value as `input` as a constant
    /// coefficient polynomial.
    ///
    /// See [crate::ops::bootstrapping::circuit_bootstrap] for more details.
    ///
    /// `pbs_radix` parameterizes the bootstrapping operation (step 1).
    ///
    /// `pfks_radix` parameterizes the PFKS operation (step 2). These should
    ///
    /// `cbs_radix` parameterizes the final decomposition of the resulting [`GgswCiphertext`]. This
    /// should match the radix used when creating the
    /// [CircuitBootstrappingKeyswitchKeys](crate::entities::CircuitBootstrappingKeyswitchKeys)
    ///
    ///
    /// # Panics
    /// If `pbs_radix`, `cbs_radix`, `pfksk_radix`, `lwe_0`, `glwe_2`, or `glwe_1` are invalid.
    /// If `pbs_radix`, `lwe_0`, `glwe_2` don't match the `radix`, `lwe`, `glwe` (respectively) used to generate `bsk`.
    /// If `pfks_radix`, `glwe_2.as_lwe_def()`, `glwe_1` parameters don't match the `radix`, `from_lwe`, `to_lwe`
    /// (respectively) used to generate `cbsksk`.
    pub fn circuit_bootstrap(
        input: &LweCiphertextRef<u64>,
        bsk: &BootstrapKeyFftRef<Complex<f64>>,
        cbsksk: &CircuitBootstrappingKeyswitchKeysRef<u64>,
        lwe_0: &LweDef,
        glwe_1: &GlweDef,
        glwe_2: &GlweDef,
        pbs_radix: &RadixDecomposition,
        cbs_radix: &RadixDecomposition,
        pfks_radix: &RadixDecomposition,
    ) -> GgswCiphertext<u64> {
        let mut out = GgswCiphertext::new(glwe_1, cbs_radix);

        crate::ops::bootstrapping::circuit_bootstrap(
            &mut out, input, bsk, cbsksk, lwe_0, glwe_1, glwe_2, pbs_radix, cbs_radix, pfks_radix,
        );

        out
    }

    /// Perform LWE keyswitching to produce a new [`LweCiphertext`] encrypted
    /// under a different [`LweSecretKey`](crate::entities::LweSecretKey).
    ///
    /// # Remarks
    /// When creating `ksk` with [`generate_ksk`](super::keygen::generate_ksk),
    /// you pass 2 different [`LweSecretKey`](crate::entities::LweSecretKey)
    /// values: a `from_sk` and `to_sk`. `ct` should be encrypted under the
    /// same `from_sk` and ciphertext this function returns will be encrypted
    /// under `to_sk`.
    pub fn keyswitch_lwe_to_lwe(
        ct: &LweCiphertextRef<u64>,
        ksk: &LweKeyswitchKeyRef<u64>,
        from_lwe: &LweDef,
        to_lwe: &LweDef,
        radix: &RadixDecomposition,
    ) -> LweCiphertext<u64> {
        let mut new_ct = LweCiphertext::new(to_lwe);
        crate::ops::keyswitch::lwe_keyswitch::keyswitch_lwe_to_lwe(
            &mut new_ct,
            ct,
            ksk,
            from_lwe,
            to_lwe,
            radix,
        );

        new_ct
    }
}
