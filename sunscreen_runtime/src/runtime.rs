use std::marker::PhantomData;
use std::time::Instant;

use merlin::Transcript;

use crate::metadata::*;
use crate::ProofBuilder;
use crate::VerificationBuilder;
use crate::ZkpProgramInput;
use crate::{error::*, Cipher};
use crate::{
    run_program_unchecked, serialization::WithContext, Ciphertext, FheProgramInput,
    InnerCiphertext, InnerPlaintext, Plaintext, PrivateKey, PublicKey, SealCiphertext, SealData,
    SealPlaintext, TryFromPlaintext, TryIntoPlaintext, TypeNameInstance,
};

use log::trace;
use sunscreen_fhe_program::FheProgramTrait;
use sunscreen_fhe_program::SchemeType;

use seal_fhe::{
    AsymmetricComponents, BFVEvaluator, BfvEncryptionParametersBuilder, Context as SealContext,
    Decryptor, Encryptor, KeyGenerator, Modulus, SymmetricComponents,
};

pub use sunscreen_compiler_common::{Type, TypeName};
use sunscreen_zkp_backend::BigInt;
use sunscreen_zkp_backend::Proof;
use sunscreen_zkp_backend::ZkpBackend;

enum Context {
    Seal(SealContext),
}

/**
 * Marker traits.
 */
pub mod marker {
    /**
     * A marker trait that denotes a [`Runtime`](super::Runtime) can
     * perform FHE operations.
     */
    pub trait Fhe {}

    /**
     * A marker trait that denotes a [`Runtime`](super::Runtime) can
     * perform ZKP operations.
     */
    pub trait Zkp {}
}

/**
 * A surrogate type for creating FHE-enabled [`Runtime`]s.
 */
pub struct Fhe {}
impl marker::Fhe for Fhe {}

/**
 * A surrogate type for creating ZKP-enabled [`Runtime`]s.
 */
pub struct Zkp {}
impl marker::Zkp for Zkp {}

/**
 * A surrogate type for creating [`Runtime`]s supporting both FHE and ZKP.
 */
pub struct FheZkp {}
impl marker::Fhe for FheZkp {}
impl marker::Zkp for FheZkp {}

struct FheRuntimeData {
    params: Params,
    context: Context,
}

struct ZkpRuntimeData;

enum RuntimeData {
    Fhe(FheRuntimeData),
    Zkp(ZkpRuntimeData),
    FheZkp(FheRuntimeData, ZkpRuntimeData),
}

impl RuntimeData {
    /**
     * Gets the inner Fhe's runtime data or panics if this value isn't
     * the [`RuntimeData::Fhe`] variant.
     *
     * # Panics
     * * If this value isn't a [`RuntimeData::Fhe`].
     */
    fn unwrap_fhe(&self) -> &FheRuntimeData {
        match self {
            Self::Fhe(x) => x,
            Self::FheZkp(x, _) => x,
            _ => panic!("Expected RuntimeData::Fhe or RuntimeData::FheZkp."),
        }
    }
}

/**
 * The generalized runtime type that provides ZKP and FHE functionality
 * depending on the generic parameter `T`. As a user, you should instead
 * use [`FheRuntime`], [`ZkpRuntime`], or [`FheZkpRuntime`] depending on
 * your needs. See [`Runtime`].
 *
 */
pub struct GenericRuntime<T, B> {
    runtime_data: RuntimeData,
    _phantom_t: PhantomData<T>,
    zkp_backend: B,
}
impl<T, B> GenericRuntime<T, B> {
    pub(crate) fn validate_arguments<A>(signature: &CallSignature, arguments: &[A]) -> Result<()>
    where
        A: TypeNameInstance,
    {
        if arguments.len() != signature.arguments.len()
            || arguments
                .iter()
                .map(|a| a.type_name_instance())
                .zip(signature.arguments.iter())
                .any(|(ty, expected)| ty != *expected)
        {
            Err(Error::argument_mismatch(
                &signature.arguments,
                &arguments
                    .iter()
                    .map(|a| a.type_name_instance())
                    .collect::<Vec<_>>(),
            ))
        } else {
            Ok(())
        }
    }
}

impl<T, B> GenericRuntime<T, B>
where
    T: self::marker::Fhe,
{
    /**
     * Decrypts the given ciphertext into the underlying type P.
     */
    // TODO replace decrypt with this function, leaving the other named `decrypt_opaque`.
    #[allow(unused)]
    pub fn decrypt_TODO<P>(&self, ciphertext: &Cipher<P>, private_key: &PrivateKey) -> Result<P>
    where
        P: TryFromPlaintext + TypeName,
    {
        let fhe_data = self.runtime_data.unwrap_fhe();
        let pt = self.decrypt_map_components::<P>(&ciphertext.inner, private_key, |_, _| ())?;
        P::try_from_plaintext(&pt, &fhe_data.params)
    }

    /**
     * Decrypts the given opaque ciphertext into the provided type P.
     */
    pub fn decrypt<P>(&self, ciphertext: &Ciphertext, private_key: &PrivateKey) -> Result<P>
    where
        P: TryFromPlaintext + TypeName,
    {
        let fhe_data = self.runtime_data.unwrap_fhe();
        let pt = self.decrypt_map_components::<P>(ciphertext, private_key, |_, _| ())?;
        P::try_from_plaintext(&pt, &fhe_data.params)
    }

    /**
     * Decrypts the given ciphertext into the type P, mapping over the inner seal decryptions.
     */
    pub(crate) fn decrypt_map_components<P>(
        &self,
        ciphertext: &Ciphertext,
        private_key: &PrivateKey,
        mut f: impl FnMut(&SealPlaintext, &SealCiphertext),
    ) -> Result<Plaintext>
    where
        P: TypeName,
    {
        let expected_type = Type {
            is_encrypted: true,
            ..P::type_name()
        };
        if expected_type != ciphertext.data_type {
            return Err(Error::type_mismatch(&expected_type, &ciphertext.data_type));
        }
        let fhe_data = self.runtime_data.unwrap_fhe();

        let val = match (&fhe_data.context, &ciphertext.inner) {
            (Context::Seal(context), InnerCiphertext::Seal(ciphertexts)) => {
                let decryptor = Decryptor::new(context, &private_key.0)?;

                let plaintexts = ciphertexts
                    .iter()
                    .map(|c| {
                        if decryptor
                            .invariant_noise_budget(c)
                            .map_err(Error::SealError)?
                            == 0
                        {
                            return Err(Error::TooMuchNoise);
                        }

                        let pt = decryptor.decrypt(c).map_err(Error::SealError)?;
                        f(&pt, c);
                        Ok(pt)
                    })
                    .collect::<Result<Vec<SealPlaintext>>>()?
                    .drain(0..)
                    .map(|p| WithContext {
                        params: fhe_data.params.clone(),
                        data: p,
                    })
                    .collect();
                Plaintext {
                    data_type: P::type_name(),
                    inner: InnerPlaintext::Seal(plaintexts),
                }
            }
        };

        Ok(val)
    }

    /**
     * Returns the amount of noise budget (in bits) remaining in the
     * given ciphertext.
     *
     * # Remarks
     * Internally, the [`Ciphertext`] object may contain more
     * than one ciphertext. This function returns the
     * *minimum* noise budget remaining of all the enclosed
     * ciphertexts.
     */
    pub fn measure_noise_budget(&self, c: &Ciphertext, private_key: &PrivateKey) -> Result<u32> {
        let fhe_data = self.runtime_data.unwrap_fhe();

        match (&fhe_data.context, &c.inner) {
            (Context::Seal(ctx), InnerCiphertext::Seal(ciphertexts)) => {
                let decryptor = Decryptor::new(ctx, &private_key.0)?;

                Ok(ciphertexts.iter().try_fold(u32::MAX, |min, c| {
                    let m = u32::min(min, decryptor.invariant_noise_budget(&c.data)?);
                    Ok::<_, seal_fhe::Error>(m)
                })?)
            }
        }
    }

    /**
     * Generates a tuple of public/private keys for the encapsulated scheme and parameters.
     *
     * # Remarks
     * For some parameters, generating some public key types may fail. For example, Galois
     * keys tend to fail creation for small parameter values. FhePrograms with small parameters
     * can't require these associated keys and so long as the FHE program was compiled using the
     * search algorithm, it won't.
     *
     * See [`PublicKey`] for more information.
     */
    pub fn generate_keys(&self) -> Result<(PublicKey, PrivateKey)> {
        let fhe_data = self.runtime_data.unwrap_fhe();

        let keys = match &fhe_data.context {
            Context::Seal(context) => {
                let keygen = KeyGenerator::new(context)?;

                let galois_keys = keygen.create_galois_keys().ok().map(|v| WithContext {
                    params: fhe_data.params.clone(),
                    data: v,
                });

                let relin_keys = keygen
                    .create_relinearization_keys()
                    .ok()
                    .map(|v| WithContext {
                        params: fhe_data.params.clone(),
                        data: v,
                    });

                let public_keys = PublicKey {
                    public_key: WithContext {
                        params: fhe_data.params.clone(),
                        data: keygen.create_public_key(),
                    },
                    galois_key: galois_keys,
                    relin_key: relin_keys,
                };
                let private_key = PrivateKey(WithContext {
                    params: fhe_data.params.clone(),
                    data: keygen.secret_key(),
                });

                (public_keys, private_key)
            }
        };

        Ok(keys)
    }

    /**
     * Returns the metadata for this runtime's associated FHE program.
     */
    pub fn params(&self) -> &Params {
        let fhe_data = self.runtime_data.unwrap_fhe();

        &fhe_data.params
    }

    /**
     * Returns the underlying SEAL context.
     */
    #[allow(unused)]
    pub(crate) fn context(&self) -> &SealContext {
        match &self.runtime_data.unwrap_fhe().context {
            Context::Seal(seal_ctx) => seal_ctx,
        }
    }

    /**
     * Validates and runs the given FHE program. Unless you can guarantee your FHE program is valid,
     * you should use this method rather than [`run_program_unchecked`].
     */
    pub fn run<I>(
        &self,
        fhe_program: &CompiledFheProgram,
        mut arguments: Vec<I>,
        public_key: &PublicKey,
    ) -> Result<Vec<Ciphertext>>
    where
        I: Into<FheProgramInput>,
    {
        // We're going to call run_program_unchecked, which
        // can result in undefined behavior, non-termination,
        // or panics on malformed programs. Since this method is safe,
        // it must guard against calling run_program_unchecked with
        // inputs that result in undefined behavior.
        fhe_program.fhe_program_fn.validate()?;

        // Aside from FHE program correctness, check that the required keys are given.
        if public_key.relin_key.is_none() && fhe_program.fhe_program_fn.requires_relin_keys() {
            return Err(Error::MissingRelinearizationKeys);
        }

        if public_key.galois_key.is_none() && fhe_program.fhe_program_fn.requires_galois_keys() {
            return Err(Error::MissingGaloisKeys);
        }

        let mut arguments: Vec<FheProgramInput> = arguments.drain(0..).map(|a| a.into()).collect();

        // Check the passed arguments' types match the signature.
        Self::validate_arguments(&fhe_program.metadata.signature, &arguments)?;

        if fhe_program.metadata.signature.num_ciphertexts.len()
            != fhe_program.metadata.signature.returns.len()
        {
            return Err(Error::ReturnTypeMetadataError);
        }

        let fhe_data = self.runtime_data.unwrap_fhe();

        match &fhe_data.context {
            Context::Seal(context) => {
                let evaluator = BFVEvaluator::new(context)?;

                let mut inputs: Vec<SealData> = vec![];

                for i in arguments.drain(0..) {
                    match i {
                        FheProgramInput::Ciphertext(c) => {
                            let c = c.into_ciphertext();
                            match c.inner {
                                InnerCiphertext::Seal(mut c) => {
                                    for j in c.drain(0..) {
                                        inputs.push(SealData::Ciphertext(j.data));
                                    }
                                }
                            }
                        }
                        FheProgramInput::Plaintext(p) => {
                            let p = p.try_into_plaintext(&fhe_data.params)?;

                            match p.inner {
                                InnerPlaintext::Seal(mut p) => {
                                    for j in p.drain(0..) {
                                        inputs.push(SealData::Plaintext(j.data));
                                    }
                                }
                            }
                        }
                    }
                }

                let relin_key = public_key.relin_key.as_ref().map(|p| &p.data);
                let galois_key = public_key.galois_key.as_ref().map(|p| &p.data);

                let mut raw_ciphertexts = unsafe {
                    run_program_unchecked(
                        &fhe_program.fhe_program_fn,
                        &inputs,
                        &evaluator,
                        &relin_key,
                        &galois_key,
                    )
                }?;

                let mut packed_ciphertexts = vec![];

                for (i, ciphertext_count) in fhe_program
                    .metadata
                    .signature
                    .num_ciphertexts
                    .iter()
                    .enumerate()
                {
                    packed_ciphertexts.push(Ciphertext {
                        data_type: fhe_program.metadata.signature.returns[i].clone(),
                        inner: InnerCiphertext::Seal(
                            raw_ciphertexts
                                .drain(0..*ciphertext_count)
                                .map(|c| WithContext {
                                    params: fhe_data.params.clone(),
                                    data: c,
                                })
                                .collect(),
                        ),
                    });
                }

                Ok(packed_ciphertexts)
            }
        }
    }

    /**
     * Encrypts the given [`FheType`](crate::FheType) using the given public key.
     *
     * Returns [`Error::ParameterMismatch`] if the plaintext is incompatible with this runtime's
     * scheme.
     */
    pub fn encrypt<P>(&self, val: P, public_key: &PublicKey) -> Result<Cipher<P>>
    where
        P: TryIntoPlaintext + TypeName,
    {
        let fhe_data = self.runtime_data.unwrap_fhe();
        match (
            &fhe_data.context,
            &val.try_into_plaintext(&fhe_data.params)?.inner,
        ) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_public_key(context, &public_key.public_key.data)?;
                Self::aggregate_ciphertexts(&P::type_name(), inner_plain, |p| encryptor.encrypt(p))
            }
        }
    }

    /// Encrypts the given [`FheType`](crate::FheType) symmetrically using the given secret
    /// key.
    ///
    /// Returns [`Error::ParameterMismatch`] if the plaintext is incompatible with this runtime's
    /// scheme.
    pub fn encrypt_symmetric<P>(&self, val: P, private_key: &PrivateKey) -> Result<Cipher<P>>
    where
        P: TryIntoPlaintext + TypeName,
    {
        let fhe_data = self.runtime_data.unwrap_fhe();
        match (
            &fhe_data.context,
            &val.try_into_plaintext(&fhe_data.params)?.inner,
        ) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_secret_key(context, &private_key.0.data)?;
                Self::aggregate_ciphertexts(&P::type_name(), inner_plain, |p| {
                    encryptor.encrypt_symmetric(p)
                })
            }
        }
    }

    /**
     * DO NOT USE THIS FUNCTION IN PRODUCTION: IT PRODUCES DETERMINISTIC
     * ENCRYPTIONS. IT IS INHERENTLY INSECURE, AND ONLY MEANT FOR TESTING OR
     * DEMONSTRATION PURPOSES.
     *
     * Encrypts the given [`FheType`](crate::FheType) using the given public key.
     *
     * Returns [`Error::ParameterMismatch`] if the plaintext is incompatible with this runtime's
     * scheme.
     */
    #[cfg(feature = "deterministic")]
    pub fn encrypt_deterministic<P>(
        &self,
        val: P,
        public_key: &PublicKey,
        seed: &[u64; 8],
    ) -> Result<Ciphertext>
    where
        P: TryIntoPlaintext + TypeName,
    {
        let fhe_data = self.runtime_data.unwrap_fhe();
        match (
            &fhe_data.context,
            &val.try_into_plaintext(&fhe_data.params)?.inner,
        ) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_public_key(context, &public_key.public_key.data)?;
                Self::aggregate_ciphertexts(&P::type_name(), inner_plain, |p| {
                    encryptor.encrypt_deterministic(p, seed)
                })
            }
        }
    }

    /**
     * DO NOT USE THIS FUNCTION IN PRODUCTION: IT PRODUCES DETERMINISTIC
     * ENCRYPTIONS. IT IS INHERENTLY INSECURE, AND ONLY MEANT FOR TESTING OR
     * DEMONSTRATION PURPOSES.
     *
     * Encrypts the given [`FheType`](crate::FheType) using the given public key.
     *
     * Returns [`Error::ParameterMismatch`] if the plaintext is incompatible with this runtime's
     * scheme.
     */
    #[cfg(feature = "deterministic")]
    pub fn encrypt_symmetric_deterministic<P>(
        &self,
        val: P,
        private_key: &PrivateKey,
        seed: &[u64; 8],
    ) -> Result<Ciphertext>
    where
        P: TryIntoPlaintext + TypeName,
    {
        let fhe_data = self.runtime_data.unwrap_fhe();
        match (
            &fhe_data.context,
            &val.try_into_plaintext(&fhe_data.params)?.inner,
        ) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_secret_key(context, &private_key.0.data)?;
                Self::aggregate_ciphertexts(&P::type_name(), inner_plain, |p| {
                    encryptor.encrypt_symmetric_deterministic(p, seed)
                })
            }
        }
    }

    #[allow(dead_code)]
    /**
     * Encrypts the given [`FheType`](crate::FheType) using the given public
     * key, allowing a closure to interact with the encryption components.
     *
     * Returns [`Error::ParameterMismatch`] if the plaintext is incompatible
     * with this runtime's scheme.
     */
    pub(crate) fn encrypt_map_components<P>(
        &self,
        val: &P,
        public_key: &PublicKey,
        mut f: impl FnMut(&SealPlaintext, &SealCiphertext, AsymmetricComponents),
    ) -> Result<Cipher<P>>
    where
        P: TryIntoPlaintext + TypeNameInstance,
    {
        let fhe_data = self.runtime_data.unwrap_fhe();
        match (
            &fhe_data.context,
            &val.try_into_plaintext(&fhe_data.params)?.inner,
        ) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_public_key(context, &public_key.public_key.data)?;
                Self::aggregate_ciphertexts(&val.type_name_instance(), inner_plain, move |p| {
                    let (ct, components) = encryptor.encrypt_return_components(p)?;
                    f(p, &ct, components);
                    Ok(ct)
                })
            }
        }
    }

    #[allow(dead_code)]
    /**
     * Encrypts the given [`FheType`](crate::FheType) symmetrically using the given private key
     * key, allowing a closure to interact with the encryption components of each inner plaintext.
     *
     * Returns [`Error::ParameterMismatch`] if the plaintext is incompatible
     * with this runtime's scheme.
     */
    pub(crate) fn encrypt_symmetric_map_components<P>(
        &self,
        val: &P,
        private_key: &PrivateKey,
        mut f: impl FnMut(&SealPlaintext, &SealCiphertext, SymmetricComponents),
    ) -> Result<Cipher<P>>
    where
        P: TryIntoPlaintext + TypeNameInstance,
    {
        let fhe_data = self.runtime_data.unwrap_fhe();
        match (
            &fhe_data.context,
            &val.try_into_plaintext(&fhe_data.params)?.inner,
        ) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_secret_key(context, &private_key.0.data)?;
                Self::aggregate_ciphertexts(&val.type_name_instance(), inner_plain, move |p| {
                    let (ct, components) = encryptor.encrypt_symmetric_return_components(p)?;
                    f(p, &ct, components);
                    Ok(ct)
                })
            }
        }
    }

    // Use a seal encryption function to encrypt a list of inner seal plaintexts `pts`,
    // representing a runtime level plaintext of type `pt_type`, and return a runtime ciphertext
    // consisting of the list of respective inner seal ciphertexts.
    fn aggregate_ciphertexts<P, F>(
        pt_type: &Type,
        pts: &[WithContext<SealPlaintext>],
        mut enc_fn: F,
    ) -> Result<Cipher<P>>
    where
        F: FnMut(&SealPlaintext) -> seal_fhe::Result<SealCiphertext>,
    {
        let cts = pts
            .iter()
            .map(|pt| {
                Ok(WithContext {
                    params: pt.params.clone(),
                    data: enc_fn(&pt.data)?,
                })
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(Cipher::new(Ciphertext {
            data_type: Type {
                is_encrypted: true,
                ..pt_type.clone()
            },
            inner: InnerCiphertext::Seal(cts),
        }))
    }
}

impl<T, B> GenericRuntime<T, B>
where
    T: marker::Zkp,
    B: ZkpBackend,
{
    /// Take each input type and transform into bigints. Optionally validate args with provided closure.
    pub(crate) fn collect_zkp_args_with<const N: usize, I>(
        args: [Vec<I>; N],
        predicate: impl FnOnce(&[Vec<ZkpProgramInput>]) -> Result<()>,
    ) -> Result<[Vec<BigInt>; N]>
    where
        I: Into<ZkpProgramInput>,
    {
        // Collect into inputs
        let inputs = args.map(|xs| xs.into_iter().map(I::into).collect::<Vec<_>>());

        // Validate inputs
        predicate(&inputs)?;

        // Collect into bigints
        let bigints = inputs.map(|xs| {
            xs.into_iter()
                .flat_map(|x| x.0.to_native_fields())
                .collect()
        });
        Ok(bigints)
    }

    /// Collect all ZKP arg types into bigints and validate against program call signature.
    pub(crate) fn collect_and_validate_zkp_args<const N: usize, I>(
        args: [Vec<I>; N],
        program: &CompiledZkpProgram,
    ) -> Result<[Vec<BigInt>; N]>
    where
        I: Into<ZkpProgramInput>,
    {
        Self::collect_zkp_args_with(args, |inputs: &[Vec<ZkpProgramInput>]| {
            let all_inputs = inputs.concat();
            Self::validate_arguments(&program.metadata.signature, &all_inputs)
        })
    }

    /// Collect ZKP arg types into bigints with no validation. Useful for verification side, as our
    /// call signature currently isn't granular enough to cover linked/private/public/constant.
    pub(crate) fn collect_zkp_args<const N: usize, I>(args: [Vec<I>; N]) -> Result<[Vec<BigInt>; N]>
    where
        I: Into<ZkpProgramInput>,
    {
        Self::collect_zkp_args_with(args, |_| Ok(()))
    }

    /**
     * Prove the given `inputs` satisfy `program`.
     */
    pub fn prove<I>(
        &self,
        program: &CompiledZkpProgram,
        private_inputs: Vec<I>,
        public_inputs: Vec<I>,
        constant_inputs: Vec<I>,
    ) -> Result<Proof>
    where
        I: Into<ZkpProgramInput>,
    {
        let [private_inputs, public_inputs, constant_inputs] = Self::collect_and_validate_zkp_args(
            [private_inputs, public_inputs, constant_inputs],
            program,
        )?;

        let backend = &self.zkp_backend;

        trace!("Starting JIT (prover)...");

        let now = Instant::now();

        let prog = backend.jit_prover(
            &program.zkp_program_fn,
            &private_inputs,
            &public_inputs,
            &constant_inputs,
        )?;

        trace!("Prover JIT time {}s", now.elapsed().as_secs_f64());

        let inputs = [public_inputs, private_inputs].concat();

        trace!("Starting backend prove...");

        Ok(backend.prove(&prog, &inputs)?)
    }

    /// Create a proof builder.
    ///
    /// This provides a wrapper around calling [`Self::prove`], and can be convenient when you
    /// have ZKP program arguments of different types. Instead of casting them all to
    /// `ZkpProgramInput`, you can add them one by one:
    ///
    /// ```rust,ignore
    /// let runtime = ZkpRuntime::new(&backend)?;
    /// let x = NativeField::from(1);
    /// let ys = [NativeField::from(2), NativeField::from(3)];
    /// let proof = runtime.proof_builder(&program)
    ///     .private_input(x)
    ///     .private_input(ys)
    ///     .prove()?;
    /// ```
    pub fn proof_builder<'r, 'p>(
        &'r self,
        program: &'p CompiledZkpProgram,
    ) -> ProofBuilder<'r, 'p, T, B> {
        ProofBuilder::new(self, program)
    }

    /**
     * Verify that the given `proof` satisfies the given `program`.
     */
    pub fn verify<I>(
        &self,
        program: &CompiledZkpProgram,
        proof: &Proof,
        public_inputs: Vec<I>,
        constant_inputs: Vec<I>,
    ) -> Result<()>
    where
        I: Into<ZkpProgramInput>,
    {
        let [public_inputs, constant_inputs] =
            Self::collect_zkp_args([public_inputs, constant_inputs])?;

        let backend = &self.zkp_backend;

        trace!("Starting JIT (verifier)");

        let now = Instant::now();

        let prog =
            backend.jit_verifier(&program.zkp_program_fn, &constant_inputs, &public_inputs)?;

        trace!("Verifier JIT time {}s", now.elapsed().as_secs_f64());
        trace!("Starting backend verify...");

        Ok(backend.verify(&prog, proof)?)
    }

    /**
     * Verify that the given `proof` satisfies the given `program`.
     */
    #[allow(unused)]
    pub(crate) fn verify_with_parameters<I>(
        &self,
        program: &CompiledZkpProgram,
        proof: &Proof,
        public_inputs: Vec<I>,
        constant_inputs: Vec<I>,
        parameters: &B::VerifierParameters,
        transcript: &mut Transcript,
    ) -> Result<()>
    where
        I: Into<ZkpProgramInput>,
    {
        let [public_inputs, constant_inputs] =
            Self::collect_zkp_args([public_inputs, constant_inputs])?;

        let backend = &self.zkp_backend;

        trace!("Starting JIT (verifier)");

        let now = Instant::now();

        let prog =
            backend.jit_verifier(&program.zkp_program_fn, &constant_inputs, &public_inputs)?;

        trace!("Verifier JIT time {}s", now.elapsed().as_secs_f64());
        trace!("Starting backend verify...");

        Ok(backend.verify_with_parameters(&prog, proof, parameters, transcript)?)
    }

    /// Create a verification builder.
    ///
    /// This provides a wrapper around calling [`Self::verify`], and can be convenient when you
    /// have ZKP program arguments of different types. Instead of casting them all to
    /// `ZkpProgramInput`, you can add them one by one:
    ///
    /// ```rust,ignore
    /// let runtime = ZkpRuntime::new(&backend)?;
    /// let x = NativeField::from(1);
    /// let ys = [NativeField::from(2), NativeField::from(3)];
    /// runtime.verification_builder(&program)
    ///     .proof(&proof)
    ///     .constant_input(x)
    ///     .public_input(ys)
    ///     .verify()?;
    /// ```
    pub fn verification_builder<'r, 'p>(
        &'r self,
        program: &'p CompiledZkpProgram,
    ) -> VerificationBuilder<'r, 'p, '_, T, B> {
        VerificationBuilder::new(self, program)
    }
}

impl GenericRuntime<(), ()> {
    #[deprecated]
    /**
     * Create a new Runtime supporting only FHE operations.
     *
     * # Deprecated
     * Please use [`new_fhe`](Runtime::new_fhe) instead.
     */
    pub fn new(params: &Params) -> Result<FheRuntime> {
        Self::new_fhe(params)
    }

    fn make_fhe_runtime_data(params: &Params) -> Result<FheRuntimeData> {
        match params.scheme_type {
            SchemeType::Bfv => {
                let bfv_params = BfvEncryptionParametersBuilder::new()
                    .set_plain_modulus_u64(params.plain_modulus)
                    .set_poly_modulus_degree(params.lattice_dimension)
                    .set_coefficient_modulus(
                        params
                            .coeff_modulus
                            .iter()
                            .map(|v| Modulus::new(*v).unwrap())
                            .collect::<Vec<Modulus>>(),
                    )
                    .build()?;

                #[cfg(feature = "insecure-params")]
                let context = SealContext::new_insecure(&bfv_params, true)?;

                #[cfg(not(feature = "insecure-params"))]
                let context = SealContext::new(&bfv_params, true, params.security_level)?;

                Ok(FheRuntimeData {
                    params: params.clone(),
                    context: Context::Seal(context),
                })
            }
        }
    }

    fn make_zkp_runtime_data() -> ZkpRuntimeData {
        ZkpRuntimeData
    }

    /**
     * Create a new Runtime supporting only FHE operations.
     */
    pub fn new_fhe(params: &Params) -> Result<FheRuntime> {
        Ok(GenericRuntime {
            runtime_data: RuntimeData::Fhe(Self::make_fhe_runtime_data(params)?),
            _phantom_t: PhantomData,
            zkp_backend: (),
        })
    }

    /**
     * Creates a new Runtime supporting only ZKP operations
     */
    pub fn new_zkp<B>(backend: B) -> Result<ZkpRuntime<B>>
    where
        B: ZkpBackend + 'static,
    {
        Ok(GenericRuntime {
            runtime_data: RuntimeData::Zkp(Self::make_zkp_runtime_data()),
            _phantom_t: PhantomData,
            zkp_backend: backend,
        })
    }

    /**
     * Creates a new Runtime supporting both ZKP and FHE operations.
     */
    pub fn new_fhe_zkp<B>(params: &Params, zkp_backend: &B) -> Result<FheZkpRuntime<B>>
    where
        B: ZkpBackend + Clone + 'static,
    {
        let runtime_data = RuntimeData::FheZkp(
            Self::make_fhe_runtime_data(params)?,
            Self::make_zkp_runtime_data(),
        );

        Ok(GenericRuntime {
            runtime_data,
            _phantom_t: PhantomData,
            zkp_backend: zkp_backend.clone(),
        })
    }
}

/**
 * A runtime capable of both FHE and ZKP operations.
 */
pub type FheZkpRuntime<B> = GenericRuntime<FheZkp, B>;

impl<B> FheZkpRuntime<B> {
    /**
     * Creates a new Runtime supporting both ZKP and FHE operations.
     */
    pub fn new(params: &Params, zkp_backend: &B) -> Result<Self>
    where
        B: ZkpBackend + Clone + 'static,
    {
        Runtime::new_fhe_zkp(params, zkp_backend)
    }
}

#[cfg(feature = "linkedproofs")]
impl FheZkpRuntime<sunscreen_zkp_backend::bulletproofs::BulletproofsBackend> {
    /// Create a new [`LinkedProofBuilder`](crate::LinkedProofBuilder).
    pub fn linkedproof_builder<'k, 'z>(&self) -> crate::LinkedProofBuilder<'_, 'k, 'z> {
        crate::LinkedProofBuilder::new(self)
    }

    /// Create a new [`LinkedProofVerificationBuilder`](crate::LinkedProofVerificationBuilder).
    pub fn linkedproof_verification_builder<'k, 'z>(
        &self,
    ) -> crate::LinkedProofVerificationBuilder<'_, 'k, 'z> {
        crate::LinkedProofVerificationBuilder::new(self)
    }
}

/**
 * A runtime capable of only FHE operations.
 */
pub type FheRuntime = GenericRuntime<Fhe, ()>;

impl FheRuntime {
    /**
     * Create a new [`FheRuntime`].
     */
    pub fn new(params: &Params) -> Result<Self> {
        Runtime::new_fhe(params)
    }
}

#[cfg(feature = "linkedproofs")]
impl FheRuntime {
    /// Create a new [`SdlpBuilder`](crate::SdlpBuilder).
    pub fn sdlp_builder<'k>(&self) -> crate::SdlpBuilder<'_, 'k> {
        crate::SdlpBuilder::new(self)
    }

    /// Create a new [`SdlpVerificationBuilder`](crate::SdlpVerificationBuilder).
    pub fn sdlp_verification_builder<'k>(&self) -> crate::SdlpVerificationBuilder<'_, 'k> {
        crate::SdlpVerificationBuilder::new(self)
    }
}

/**
 * A runtime capable of only ZKP operations.
 */
pub type ZkpRuntime<B> = GenericRuntime<Zkp, B>;

impl<B> ZkpRuntime<B> {
    /**
     * Create a new [`ZkpRuntime`].
     */
    pub fn new(backend: B) -> Result<Self>
    where
        B: ZkpBackend + 'static,
    {
        Runtime::new_zkp(backend)
    }
}

/**
 * A type containing the `Runtime::new_*` constructor methods to create
 * the appropriate runtime:
 *
 * * [`Runtime::new_fhe`] constructs an [`FheRuntime`] capable of
 *   performing FHE-related tasks, but not ZKP tasks.
 * * [`Runtime::new_zkp`] constructs a [`ZkpRuntime`] capable of
 *   performing ZKP tasks, but not FHE.
 * * [`Runtime::new_fhe_zkp`] constructs a [`FheZkpRuntime`] that
 *   can do both.
 */
pub type Runtime = GenericRuntime<(), ()>;
