use std::marker::PhantomData;
use std::time::Instant;

use merlin::Transcript;

use crate::error::*;
use crate::metadata::*;
use crate::ProofBuilder;
use crate::VerificationBuilder;
use crate::ZkpProgramInput;
use crate::{
    run_program_unchecked, serialization::WithContext, Ciphertext, CompiledZkpProgram,
    FheProgramInput, InnerCiphertext, InnerPlaintext, Plaintext, PrivateKey, PublicKey,
    SealCiphertext, SealData, SealPlaintext, TryFromPlaintext, TryIntoPlaintext, TypeNameInstance,
};

use log::trace;
use sunscreen_fhe_program::FheProgramTrait;
use sunscreen_fhe_program::SchemeType;

use seal_fhe::{
    BFVEvaluator, BfvEncryptionParametersBuilder, Context as SealContext, Decryptor, Encryptor,
    KeyGenerator, Modulus, PolynomialArray,
};

pub use sunscreen_compiler_common::{Type, TypeName};
use sunscreen_zkp_backend::BigInt;
use sunscreen_zkp_backend::Proof;
use sunscreen_zkp_backend::ZkpBackend;

#[cfg(feature = "deterministic")]
fn encrypt_function(
    encryptor: &Encryptor,
    val: &seal_fhe::Plaintext,
    seed: Option<&[u64; 8]>,
) -> Result<(
    seal_fhe::Ciphertext,
    PolynomialArray,
    PolynomialArray,
    seal_fhe::Plaintext,
)> {
    let result = if let Some(seed) = seed {
        encryptor.encrypt_return_components_deterministic(val, seed)
    } else {
        encryptor.encrypt_return_components(val)
    };

    result.map_err(Error::SealError)
}

#[cfg(not(feature = "deterministic"))]
fn encrypt_function(
    encryptor: &Encryptor,
    val: &seal_fhe::Plaintext,
    _seed: Option<&[u64; 8]>,
) -> Result<(
    seal_fhe::Ciphertext,
    PolynomialArray,
    PolynomialArray,
    seal_fhe::Plaintext,
)> {
    encryptor
        .encrypt_return_components(val)
        .map_err(Error::SealError)
}

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
 * Components needed to perform BFV encryption. Specifically, BFV is defined by the following equation in SEAL:
 *
 * 1. $\Delta m + r + p_0 u + e_1 = c_0$
 * 2. $p_1 u + e_2 = c_1$
 *
 * where
 * - $\Delta$ is the floored ratio of the coefficient and plaintext modulus
 *   (floor(q/t)).
 * - $m$ is the message encoded as a SEAL plaintext.
 * - $r$ is the remainder from the delta calculation that SEAL adds to the
 *   ciphertext to handle rounding.
 * - $p_i$ is the $i$th component of the public key, starting at index 0.
 * - $u$ is a randomly sampled ternary polynomial (coefficients are sampled from
 *   {-1, 0, 1} mod q).
 * - $e_i$ is the $i$th component of the noise added to the ciphertext, starting
 *   at index 1. These values are sampled from a centered binomial distribution
 *   with a standard deviation of 3.2.
 * - $c_i$ is the $i$th component of the ciphertext, starting at index 0.
 *
 * Note that the indices used here match the SEAL/manual and the original paper,
 * where $p_i$ is used with the error term $e_{i + 1}$ and where $e_0$ does not
 * exist.
 *
 * Since the ciphertext can contain more that one ciphertext underneath, each of
 * the components is returned as a vector of the components matching the number
 * of ciphertexts.
 */
#[allow(unused)]
pub struct BFVEncryptionComponents {
    pub(crate) ciphertext: Ciphertext,
    pub(crate) u: Vec<PolynomialArray>,
    pub(crate) e: Vec<PolynomialArray>,
    pub(crate) r: Vec<Plaintext>,
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
     * Decrypts the given ciphertext into the type P.
     */
    pub fn decrypt<P>(&self, ciphertext: &Ciphertext, private_key: &PrivateKey) -> Result<P>
    where
        P: TryFromPlaintext + TypeName,
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

                        decryptor.decrypt(c).map_err(Error::SealError)
                    })
                    .collect::<Result<Vec<SealPlaintext>>>()?
                    .drain(0..)
                    .map(|p| WithContext {
                        params: fhe_data.params.clone(),
                        data: p,
                    })
                    .collect();

                P::try_from_plaintext(
                    &Plaintext {
                        data_type: P::type_name(),
                        inner: InnerPlaintext::Seal(plaintexts),
                    },
                    &fhe_data.params,
                )?
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
                        FheProgramInput::Ciphertext(c) => match c.inner {
                            InnerCiphertext::Seal(mut c) => {
                                for j in c.drain(0..) {
                                    inputs.push(SealData::Ciphertext(j.data));
                                }
                            }
                        },
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
    pub fn encrypt<P>(&self, val: P, public_key: &PublicKey) -> Result<Ciphertext>
    where
        P: TryIntoPlaintext + TypeName,
    {
        self.encrypt_return_components_switched(val, public_key, false, None)
            .map(|x| x.ciphertext)
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
        self.encrypt_return_components_switched(val, public_key, false, Some(seed))
            .map(|x| x.ciphertext)
    }

    #[allow(dead_code)]
    /**
     * Encrypts the given [`FheType`](crate::FheType) using the given public
     * key, and the components used in encrypting the data.
     *
     * Returns [`Error::ParameterMismatch`] if the plaintext is incompatible
     * with this runtime's scheme.
     */
    pub(crate) fn encrypt_return_components<P>(
        &self,
        val: P,
        public_key: &PublicKey,
    ) -> Result<BFVEncryptionComponents>
    where
        P: TryIntoPlaintext + TypeName,
    {
        self.encrypt_return_components_switched(val, public_key, true, None)
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
    #[allow(dead_code)]
    fn encrypt_return_components_deterministic<P>(
        &self,
        val: P,
        public_key: &PublicKey,
        seed: &[u64; 8],
    ) -> Result<BFVEncryptionComponents>
    where
        P: TryIntoPlaintext + TypeName,
    {
        self.encrypt_return_components_switched(val, public_key, true, Some(seed))
    }

    /**
     * Encrypts the given [`FheType`](crate::FheType) using the given public
     * key, returning the encrypted value along with the components added to the
     * message. See `BFVEncryptionComponents` for the pieces returned.
     *
     * Note that this will disable the special modulus!
     *
     * Returns [`Error::ParameterMismatch`] if the plaintext is incompatible with this runtime's
     * scheme.
     */
    pub(crate) fn encrypt_return_components_switched<P>(
        &self,
        val: P,
        public_key: &PublicKey,
        export_components: bool,
        seed: Option<&[u64; 8]>,
    ) -> Result<BFVEncryptionComponents>
    where
        P: TryIntoPlaintext + TypeName,
    {
        let plaintext = val.try_into_plaintext(self.params())?;
        let plaintext_type = P::type_name();
        self.encrypt_return_components_switched_internal(
            &plaintext,
            &plaintext_type,
            public_key,
            export_components,
            seed,
        )
    }

    pub(crate) fn encrypt_return_components_switched_internal(
        &self,
        plaintext: &Plaintext,
        plaintext_type: &Type,
        public_key: &PublicKey,
        export_components: bool,
        seed: Option<&[u64; 8]>,
    ) -> Result<BFVEncryptionComponents> {
        let fhe_data = self.runtime_data.unwrap_fhe();
        let (ciphertext, u, e, r) = match (&fhe_data.context, &plaintext.inner) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_public_key(context, &public_key.public_key.data)?;

                let capacity = if export_components {
                    inner_plain.len()
                } else {
                    0
                };
                let mut us = Vec::with_capacity(capacity);
                let mut es = Vec::with_capacity(capacity);
                let mut rs = Vec::with_capacity(capacity);

                let ciphertexts = inner_plain
                    .iter()
                    .map(|p| {
                        let ciphertext = if !export_components {
                            encryptor.encrypt(p).map_err(Error::SealError)
                        } else {
                            let (ciphertext, u, e, r) = encrypt_function(&encryptor, p, seed)?;

                            let r_context = WithContext {
                                params: fhe_data.params.clone(),
                                data: r,
                            };

                            let r = Plaintext {
                                data_type: plaintext_type.clone(),
                                inner: InnerPlaintext::Seal(vec![r_context]),
                            };

                            us.push(u);
                            es.push(e);
                            rs.push(r);

                            Ok(ciphertext)
                        }?;

                        Ok(ciphertext)
                    })
                    .collect::<Result<Vec<SealCiphertext>>>()?
                    .into_iter()
                    .map(|c| WithContext {
                        params: fhe_data.params.clone(),
                        data: c,
                    })
                    .collect();

                (
                    Ciphertext {
                        data_type: Type {
                            is_encrypted: true,
                            ..plaintext_type.clone()
                        },
                        inner: InnerCiphertext::Seal(ciphertexts),
                    },
                    us,
                    es,
                    rs,
                )
            }
        };

        Ok(BFVEncryptionComponents {
            ciphertext,
            u,
            e,
            r,
        })
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
