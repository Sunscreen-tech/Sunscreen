use std::marker::PhantomData;

use crate::error::*;
use crate::metadata::*;
use crate::{
    run_program_unchecked, serialization::WithContext, Ciphertext, FheProgramInput,
    InnerCiphertext, InnerPlaintext, Plaintext, PrivateKey, PublicKey, SealCiphertext, SealData,
    SealPlaintext, TryFromPlaintext, TryIntoPlaintext, TypeNameInstance,
};

use sunscreen_fhe_program::SchemeType;

use seal_fhe::{
    BFVEvaluator, BfvEncryptionParametersBuilder, Context as SealContext, Decryptor, Encryptor,
    KeyGenerator, Modulus,
};

pub use sunscreen_compiler_common::{Type, TypeName};

enum Context {
    Seal(SealContext),
}

/**
 * Marker traits.
 */
pub mod marker {
    /**
     * A marker trait that denotes a [`Runtime`] can perform FHE operations.
     */
    pub trait Fhe {}

    /**
     * A marker trait that denotes a [`Runtime`] can perform ZKP operations.
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

enum RuntimeData {
    Fhe(FheRuntimeData),
    Zkp,
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
            _ => panic!("Expected RuntimeData::Fhe."),
        }
    }
}

/**
 * Contains all the elements needed to encrypt, decrypt, generate keys, and evaluate FHE programs.
 */
pub struct GenericRuntime<T> {
    runtime_data: RuntimeData,
    _phantom: PhantomData<T>,
}

impl<T> GenericRuntime<T>
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
            return Err(Error::TypeMismatch {
                expected: expected_type,
                actual: ciphertext.data_type.clone(),
            });
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
            return Err(Error::ArgumentMismatch {
                expected: expected_args.clone(),
                actual: arguments.iter().map(|a| a.type_name_instance()).collect(),
            });
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

impl GenericRuntime<()> {
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

    /**
     * Create a new Runtime supporting only FHE operations.
     */
    pub fn new_fhe(params: &Params) -> Result<FheRuntime> {
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

                Ok(GenericRuntime {
                    runtime_data: RuntimeData::Fhe(FheRuntimeData {
                        context: Context::Seal(context),
                        params: params.clone(),
                    }),
                    _phantom: PhantomData,
                })
            }
        }
    }

    /**
     * Creates a new Runtime supporting only ZKP operations
     */
    pub fn new_zkp() -> Result<ZkpRuntime> {
        Ok(GenericRuntime {
            runtime_data: RuntimeData::Zkp,
            _phantom: PhantomData,
        })
    }

    /**
     * Creates a new Runtime supporting both ZKP and FHE operations.
     */
    pub fn new_fhe_zkp(params: &Params) -> Result<FheZkpRuntime> {
        let runtime = Self::new_fhe(params)?;

        Ok(unsafe { std::mem::transmute(runtime) })
    }
}

/**
 * A runtime capable of both FHE and ZKP operations.
 */
pub type FheZkpRuntime = GenericRuntime<FheZkp>;

/**
 * A runtime capable of only FHE operations.
 */
pub type FheRuntime = GenericRuntime<FheZkp>;

/**
 * A runtime capable of only ZKP operations.
 */
pub type ZkpRuntime = GenericRuntime<FheZkp>;

/**
 * An unconstructed runtime type which allows you to call
 * the `Runtime::new_*` methods to create one capable of the desired
 * operations.
 */
pub type Runtime = GenericRuntime<()>;
