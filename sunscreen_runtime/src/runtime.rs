use crate::args::*;
use crate::error::*;
use crate::metadata::*;
use crate::{
    run_program_unchecked, InnerPlaintext, Plaintext, PublicKey, TryFromPlaintext, TryIntoPlaintext,
};
use sunscreen_circuit::{Circuit, SchemeType};

use seal::{
    BFVEvaluator, BfvEncryptionParametersBuilder, Ciphertext, Context as SealContext, Decryptor,
    Encryptor, KeyGenerator, Modulus, SecretKey,
};

use std::vec::Drain;

enum Context {
    Seal(SealContext),
}

/**
 * A private runtime is one that can perform operations that require either a public or
 * secret key.
 */
pub struct PrivateRuntime {
    public_runtime: PublicRuntime,
}

impl std::ops::Deref for PrivateRuntime {
    type Target = PublicRuntime;

    fn deref(&self) -> &Self::Target {
        &self.public_runtime
    }
}

impl PrivateRuntime {
    /**
     * Creates a new [`PrivateRuntime`].
     */
    pub fn new(metadata: &CircuitMetadata) -> Result<Self> {
        Ok(Self {
            public_runtime: PublicRuntime::new(metadata)?,
        })
    }

    /**
     * Decrypts the given ciphertext using the given secret key.
     */
    pub fn decrypt<P: TryFromPlaintext>(
        &self,
        ciphertexts: &mut Drain<Ciphertext>,
        secret_key: &SecretKey,
    ) -> Result<P> {
        let val = match &self.context {
            Context::Seal(context) => {
                let decryptor = Decryptor::new(&context, secret_key)?;

                let mut plaintext = ciphertexts
                    .map(|c| decryptor.decrypt(&c))
                    .map(|p| {
                        match p {
                            Ok(p) => Ok(Plaintext {
                                params: self.metadata.params.clone(),
                                inner: InnerPlaintext::Seal(p),
                            }),
                            Err(e) => Err(Error::from(e))
                        }
                    });

                P::try_from_plaintext(&mut plaintext, &self.metadata.params)?
            }
        };

        Ok(val)
    }

    /**
     * Generates a tuple of public/private keys for the encapsulated scheme and parameters.
     *
     * See [`PublicKey`] for more information.
     */
    pub fn generate_keys(&self) -> Result<(PublicKey, SecretKey)> {
        let keys = match &self.context {
            Context::Seal(context) => {
                let keygen = KeyGenerator::new(&context)?;

                let public_keys = PublicKey {
                    public_key: keygen.create_public_key(),
                    galois_key: Some(keygen.create_galois_keys()?),
                    relin_key: Some(keygen.create_relinearization_keys()?),
                };

                (public_keys, keygen.secret_key())
            }
        };

        Ok(keys)
    }
}

/**
 * Contains all the elements needed to encrypt, decrypt, generate keys, and evaluate circuits.
 */
pub struct PublicRuntime {
    /**
     * The parameters used to construct the scheme used in this runtime.
     */
    metadata: CircuitMetadata,

    /**
     * The context associated with the BFV scheme. Created by [`RuntimeBuilder`].
     */
    context: Context,
}

impl PublicRuntime {
    /**
     * Create a new Public Runtime. A public runtime is capable of doing cryptographic operations
     * that involve only public keys.
     */
    pub fn new(metadata: &CircuitMetadata) -> Result<Self> {
        match metadata.params.scheme_type {
            SchemeType::Bfv => {
                let bfv_params = BfvEncryptionParametersBuilder::new()
                    .set_plain_modulus_u64(metadata.params.plain_modulus)
                    .set_poly_modulus_degree(metadata.params.lattice_dimension)
                    .set_coefficient_modulus(
                        metadata
                            .params
                            .coeff_modulus
                            .iter()
                            .map(|v| Modulus::new(*v).unwrap())
                            .collect::<Vec<Modulus>>(),
                    )
                    .build()?;

                let context = SealContext::new(&bfv_params, true, metadata.params.security_level)?;

                Ok(Self {
                    context: Context::Seal(context),
                    metadata: metadata.clone(),
                })
            }
            _ => unimplemented!(),
        }
    }

    /**
     * Returns the metadata for this runtime's associated circuit.
     */
    pub fn get_metadata(&self) -> &CircuitMetadata {
        &self.metadata
    }

    /**
     * Validates and runs the given circuit. Unless you can guarantee your circuit is valid,
     * you should use this method rather than [`run_program_unchecked`].
     */
    pub fn run(&self, ir: &Circuit, input_bundle: InputBundle) -> Result<OutputBundle> {
        ir.validate()?;

        // Aside from circuit correctness, check that the required keys are given.
        if input_bundle.relin_keys.is_none() && ir.requires_relin_keys() {
            return Err(Error::MissingRelinearizationKeys);
        }

        if input_bundle.galois_keys.is_none() && ir.requires_galois_keys() {
            return Err(Error::MissingGaloisKeys);
        }

        if ir.num_inputs() != input_bundle.ciphertexts.len() {
            return Err(Error::IncorrectCiphertextCount);
        }

        match &self.context {
            Context::Seal(context) => {
                let evaluator = BFVEvaluator::new(&context)?;

                Ok(OutputBundle(unsafe {
                    run_program_unchecked(
                        ir,
                        &input_bundle.ciphertexts,
                        &evaluator,
                        input_bundle.relin_keys,
                        input_bundle.galois_keys,
                    )
                }))
            }
        }
    }

    /**
     * Encrypts the given [`FheType`] using the given public key.
     *
     * Returns [`Error::ParameterMismatch`] if the plaintext is incompatible with this runtime's
     * scheme.
     */
    pub fn encrypt<P: TryIntoPlaintext>(
        &self,
        p: &P,
        public_key: &PublicKey,
    ) -> Result<Vec<Ciphertext>> {
        let p = p.try_into_plaintext(&self.metadata.params)?;

        Ok(self.encrypt_plaintext(&p, public_key)?)
    }

    fn encrypt_plaintext(
        &self,
        plaintexts: &[Plaintext],
        public_key: &PublicKey,
    ) -> Result<Vec<Ciphertext>> {
        let ciphertexts = match &self.context {
            Context::Seal(context) => plaintexts
                .iter()
                .map(|p| match &p.inner {
                    InnerPlaintext::Seal(p) => {
                        let encryptor =
                            Encryptor::with_public_key(&context, &public_key.public_key)?;

                        encryptor.encrypt(&p)
                    }
                    _ => {
                        unimplemented!();
                    }
                })
                .collect::<std::result::Result<Vec<Ciphertext>, seal::Error>>()?,
        };

        Ok(ciphertexts)
    }

    /**
     * Validates and encrypts the given arguments, returning a bundle of all the ciphertexts
     * and keys needed to run the circuit given by this runtime's [`CircuitMetadata`].
     *
     * # Remarks
     * This method looks at the [`CircuitMetadata`] associated with this runtime to determine
     * which keys are required. The returned [`Result`] will contain an error if:
     * * The type signatures in the [`Arguments`] object don't match those in the circtuit's
     * call signature.
     * * The circuit requires Galois keys, but the [`PublicKey`] object lacks them.
     * * The circuit requires relinearization keys, but the [`PublicKey`] object lacks them.
     *
     * The latter two conditions should generally never happen during the normal course of using
     * Sunscreen's API.
     */
    pub fn encrypt_args(&self, args: &Arguments, public_key: &PublicKey) -> Result<InputBundle> {
        let types: Vec<Type> = args.args.iter().map(|t| t.type_name_instance()).collect();

        if types != self.metadata.signature.arguments {
            return Err(Error::ArgumentMismatch {
                expected: self.metadata.signature.arguments.clone(),
                actual: types,
            });
        }

        let mut ciphertexts = vec![];

        for t in &args.args {
            let p = t.try_into_plaintext(&self.metadata.params)?;
            ciphertexts.append(&mut self.encrypt_plaintext(&p, public_key)?);
        }

        let galois_keys = if self
            .metadata
            .required_keys
            .iter()
            .find(|k| **k == RequiredKeys::Galois)
            .is_some()
        {
            match &public_key.galois_key {
                Some(g) => Some(g.clone()),
                _ => {
                    return Err(Error::MissingGaloisKeys);
                }
            }
        } else {
            None
        };

        let relin_keys = if self
            .metadata
            .required_keys
            .iter()
            .find(|k| **k == RequiredKeys::Relin)
            .is_some()
        {
            match &public_key.relin_key {
                Some(r) => Some(r.clone()),
                _ => {
                    return Err(Error::MissingRelinearizationKeys);
                }
            }
        } else {
            None
        };

        let public_key = if self
            .metadata
            .required_keys
            .iter()
            .find(|k| **k == RequiredKeys::PublicKey)
            .is_some()
        {
            Some(public_key.public_key.clone())
        } else {
            None
        };

        // TODO: Pass real keys here.
        Ok(InputBundle {
            ciphertexts,
            galois_keys: galois_keys,
            relin_keys: relin_keys,
            public_keys: public_key,
        })
    }
}
