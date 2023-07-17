use std::marker::PhantomData;
use std::sync::atomic::AtomicUsize;
use std::time::Instant;

use crate::debugger::server::start_web_server;
use crate::error::*;
use crate::metadata::*;
use crate::DebugInfo;
use crate::ZkpProgramInput;
use crate::{
    run_program_unchecked, serialization::WithContext, Ciphertext, FheProgramInput,
    InnerCiphertext, InnerPlaintext, Plaintext, PrivateKey, PublicKey, SealCiphertext, SealData,
    SealPlaintext, TryFromPlaintext, TryIntoPlaintext, TypeNameInstance,
};

use log::trace;
use seal_fhe::SecretKey;
use sunscreen_fhe_program::FheProgramTrait;
use sunscreen_fhe_program::SchemeType;

use seal_fhe::{
    BFVEvaluator, BfvEncryptionParametersBuilder, Context as SealContext, Decryptor, Encryptor,
    KeyGenerator, Modulus,
};

pub use sunscreen_compiler_common::{Type, TypeName};
use sunscreen_zkp_backend::BigInt;
use sunscreen_zkp_backend::CompiledZkpProgram;
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

                Ok(ciphertexts
                    .iter()
                    .fold(Ok(u32::MAX), |min: Result<u32>, c| {
                        Ok(u32::min(min?, decryptor.invariant_noise_budget(&c.data)?))
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
     * Validates and runs the given FHE program. Unless you can guarantee your FHE program is valid,
     * you should use this method rather than [`run_program_unchecked`].
     */
    fn run_impl<I>(
        &self,
        fhe_program: &CompiledFheProgram,
        mut arguments: Vec<I>,
        public_key: &PublicKey,
        dbg_info: Option<DebugInfo>,
        #[cfg(feature = "debugger")]
        source_code: &str
    ) -> Result<Vec<Ciphertext>>
    where
        I: Into<FheProgramInput>,
    {
        println!("{:?}", "run_program_unchecked".to_owned());
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

        let expected_args = &fhe_program.metadata.signature.arguments;

        // Check the arguments match the signature.
        if expected_args.len() != arguments.len() {
            return Err(Error::IncorrectCiphertextCount);
        }

        // Check the passed arguments' types match the signature.
        if arguments
            .iter()
            .enumerate()
            .any(|(i, a)| a.type_name_instance() != expected_args[i])
        {
            return Err(Error::argument_mismatch(
                expected_args,
                &arguments
                    .iter()
                    .map(|a| a.type_name_instance())
                    .collect::<Vec<Type>>(),
            ));
        }

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
                        dbg_info,
                        #[cfg(feature = "debugger")]
                        source_code
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
     * Used for non-debugging purposes. Calls `run_impl` without a secret key.
     */
    pub fn run<I>(
        &self,
        fhe_program: &CompiledFheProgram,
        arguments: Vec<I>,
        public_key: &PublicKey,
    ) -> Result<Vec<Ciphertext>>
    where
        I: Into<FheProgramInput>,
    {
        self.run_impl(fhe_program, arguments, public_key, None, 
            #[cfg(feature = "debugger")]
            "")
    }

    /**
     * Used for debugging. Calls `run_impl` with a secret key.
     */

    // TODO: maybe SecretKey needs to be changed to PrivateKey?
    // probably should: can always access a SecretKey via &PrivateKey.0
    // don't think this should cause any security issues?
    pub async fn debug_fhe_program<I>(
        &self,
        fhe_program: &CompiledFheProgram,
        arguments: Vec<I>,
        public_key: &PublicKey,
        secret_key: &SecretKey,
        #[cfg(feature = "debugger")]
        source_code: &str
    ) where
        I: Into<FheProgramInput>,
    {
        static SESSION_NUM: AtomicUsize = AtomicUsize::new(0);

        let session_name = format!(
            "{}_{}",
            fhe_program.metadata.name,
            SESSION_NUM.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
        );

        self.run_impl(
            fhe_program,
            arguments,
            public_key,
            Some(DebugInfo {
                secret_key,
                session_name,
            }),
            #[cfg(feature = "debugger")]
            source_code
        );
        start_web_server().await;
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
        let fhe_data = self.runtime_data.unwrap_fhe();

        let plaintext = val.try_into_plaintext(&fhe_data.params)?;

        let ciphertext = match (&fhe_data.context, plaintext.inner) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_public_key(context, &public_key.public_key.data)?;

                let ciphertexts = inner_plain
                    .iter()
                    .map(|p| encryptor.encrypt(p).map_err(Error::SealError))
                    .collect::<Result<Vec<SealCiphertext>>>()?
                    .drain(0..)
                    .map(|c| WithContext {
                        params: fhe_data.params.clone(),
                        data: c,
                    })
                    .collect();

                Ciphertext {
                    data_type: Type {
                        is_encrypted: true,
                        ..P::type_name()
                    },
                    inner: InnerCiphertext::Seal(ciphertexts),
                }
            }
        };

        Ok(ciphertext)
    }
}

impl<T, B> GenericRuntime<T, B>
where
    T: marker::Zkp,
    B: ZkpBackend,
{
    /**
     * Prove the given `inputs` satisfy `program`.
     */
    pub fn prove<I>(
        &self,
        program: &CompiledZkpProgram,
        constant_inputs: Vec<I>,
        public_inputs: Vec<I>,
        private_inputs: Vec<I>,
    ) -> Result<Proof>
    where
        I: Into<ZkpProgramInput>,
    {
        let constant_inputs = constant_inputs
            .into_iter()
            .flat_map(|x| I::into(x).0.to_native_fields())
            .collect::<Vec<BigInt>>();
        let public_inputs = public_inputs
            .into_iter()
            .flat_map(|x| I::into(x).0.to_native_fields())
            .collect::<Vec<BigInt>>();
        let private_inputs = private_inputs
            .into_iter()
            .flat_map(|x| I::into(x).0.to_native_fields())
            .collect::<Vec<BigInt>>();

        let backend = &self.zkp_backend;

        trace!("Starting JIT (prover)...");

        let now = Instant::now();

        let prog =
            backend.jit_prover(program, &constant_inputs, &public_inputs, &private_inputs)?;

        trace!("Prover JIT time {}s", now.elapsed().as_secs_f64());

        let inputs = [public_inputs, private_inputs].concat();

        trace!("Starting backend prove...");

        Ok(backend.prove(&prog, &inputs)?)
    }

    /**
     * Verify that the given `proof` satisfies the given `program`.
     */
    pub fn verify<I>(
        &self,
        program: &CompiledZkpProgram,
        proof: &Proof,
        constant_inputs: Vec<I>,
        public_inputs: Vec<I>,
    ) -> Result<()>
    where
        I: Into<ZkpProgramInput>,
    {
        let constant_inputs = constant_inputs
            .into_iter()
            .flat_map(|x| I::into(x).0.to_native_fields())
            .collect::<Vec<BigInt>>();
        let public_inputs = public_inputs
            .into_iter()
            .flat_map(|x| I::into(x).0.to_native_fields())
            .collect::<Vec<BigInt>>();

        let backend = &self.zkp_backend;

        trace!("Starting JIT (verifier)");

        let now = Instant::now();

        let prog = backend.jit_verifier(program, &constant_inputs, &public_inputs)?;

        trace!("Verifier JIT time {}s", now.elapsed().as_secs_f64());
        trace!("Starting backend verify...");

        Ok(backend.verify(&prog, proof)?)
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
    pub fn new_zkp<B>(backend: &B) -> Result<ZkpRuntime<B>>
    where
        B: ZkpBackend + Clone + 'static,
    {
        Ok(GenericRuntime {
            runtime_data: RuntimeData::Zkp(Self::make_zkp_runtime_data()),
            _phantom_t: PhantomData,
            zkp_backend: backend.clone(),
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
    pub fn new(backend: &B) -> Result<Self>
    where
        B: ZkpBackend + Clone + 'static,
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
