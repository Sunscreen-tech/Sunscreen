use crate::args::*;
use crate::error::*;
use crate::metadata::*;
use crate::{
    run_program_unchecked, InnerPlaintext, Plaintext, TryFromPlaintext, TryIntoPlaintext,
};
use sunscreen_circuit::{Circuit, SchemeType};

use seal::{
    BFVEvaluator, BfvEncryptionParametersBuilder, Ciphertext, Context as SealContext, Decryptor,
    Encryptor, GaloisKeys, KeyGenerator, Modulus, PublicKey, RelinearizationKeys, SecretKey,
};

enum Context {
    Seal(SealContext),
}

/**
 * Contains all the elements needed to encrypt, decrypt, generate keys, and evaluate circuits.
 */
pub struct Runtime {
    /**
     * The parameters used to construct the scheme used in this runtime.
     */
    metadata: CircuitMetadata,

    /**
     * The context associated with the BFV scheme. Created by [`RuntimeBuilder`].
     */
    context: Context,
}

impl Runtime {
    /**
     * Generates a tuple of public/private keys for the encapsulated scheme and parameters.
     */
    pub fn generate_keys(&self) -> Result<(PublicKey, SecretKey)> {
        let keys = match &self.context {
            Context::Seal(context) => {
                let keygen = KeyGenerator::new(&context)?;

                (keygen.create_public_key(), keygen.secret_key())
            }
        };

        Ok(keys)
    }

    /**
     * Generates Galois keys needed for SIMD rotations.
     */
    pub fn generate_galois_keys(&self, secret_key: &SecretKey) -> Result<GaloisKeys> {
        let keys = match &self.context {
            Context::Seal(context) => {
                let keygen = KeyGenerator::new_from_secret_key(&context, secret_key)?;

                keygen.create_galois_keys()?
            }
        };

        Ok(keys)
    }

    /**
     * Generates Relinearization keys needed for BFV.
     */
    pub fn generate_relin_keys(&self, secret_key: &SecretKey) -> Result<RelinearizationKeys> {
        let keys = match &self.context {
            Context::Seal(context) => {
                let keygen = KeyGenerator::new_from_secret_key(&context, secret_key)?;

                keygen.create_relinearization_keys()?
            },
        };

        Ok(keys)
    }

    /**
     * Validates and runs the given circuit. Unless you can guarantee your circuit is valid,
     * you should use this method rather than [`run_program_unchecked`].
     */
    pub fn run(
        &self,
        ir: &Circuit,
        input_bundle: InputBundle,
    ) -> Result<Vec<Ciphertext>> {
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

                Ok(unsafe {
                    run_program_unchecked(ir, &input_bundle.ciphertexts, &evaluator, input_bundle.relin_keys, input_bundle.galois_keys)
                })
            },
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
    ) -> Result<Ciphertext> {
        let p = p.try_into_plaintext(&self.metadata.params)?;

        Ok(self.encrypt_plaintext(p, public_key)?)
    }

    fn encrypt_plaintext(&self, p: Plaintext, public_key: &PublicKey) -> Result<Ciphertext> {
        let ciphertext = match &self.context {
            Context::Seal(context) => {
                match &p.inner {
                    InnerPlaintext::Seal(p) => {
                        let encryptor = Encryptor::with_public_key(&context, public_key)?;

                        encryptor.encrypt(&p)?
                    }
                    _ => {
                        unimplemented!();
                    }
                }
            },
        };

        Ok(ciphertext)
    }

    /**
     * Decrypts the given ciphertext using the given secret key.
     */
    pub fn decrypt<P: TryFromPlaintext>(
        &self,
        c: &Ciphertext,
        secret_key: &SecretKey,
    ) -> Result<P> {
        let val = match &self.context {
            Context::Seal(context) => {
                let decryptor = Decryptor::new(&context, secret_key)?;

                let plaintext = decryptor.decrypt(&c)?;

                P::try_from_plaintext(
                    &Plaintext {
                        params: self.metadata.params.clone(),
                        inner: InnerPlaintext::Seal(plaintext),
                    },
                    &self.metadata.params,
                )?
            },
        };

        Ok(val)
    }

    /**
     * Validates and encrypts the given arguments, returning a bundle of all the ciphertexts
     * and keys needed to run the circuit given by this runtime's [`CircuitMetadata`].
     */
    pub fn encrypt_args(&self, args: &Arguments, public_key: &PublicKey) -> Result<InputBundle> {
        let types: Vec<Type> = args.args.iter().map(|t| t.type_name_instance()).collect();

        if types != self.metadata.signature.arguments {
            return Err(Error::ArgumentMismatch{ 
                expected: self.metadata.signature.arguments.clone(),
                actual: types,
            });
        }

        let mut ciphertexts = vec![];

        for t in &args.args {
            let p = t.try_into_plaintext(&self.metadata.params)?;
            ciphertexts.push(self.encrypt_plaintext(p, public_key)?);
        }
        
        // TODO: Pass real keys here.
        Ok(InputBundle {
            ciphertexts,
            galois_keys: None,
            relin_keys: None,
            public_keys: None,
        })
    }
}

/**
 * Constructs a [`Runtime`].
 */
pub struct RuntimeBuilder {
    metadata: CircuitMetadata,
}

impl RuntimeBuilder {
    /**
     * Creates a Runtime with the given parameters.
     */
    pub fn new(metadata: &CircuitMetadata) -> Self {
        Self {
            metadata: metadata.clone(),
        }
    }

    /**
     * Builds the runtime.
     */
    pub fn build(self) -> Result<Runtime> {
        match self.metadata.params.scheme_type {
            SchemeType::Bfv => {
                let bfv_params = BfvEncryptionParametersBuilder::new()
                    .set_plain_modulus_u64(self.metadata.params.plain_modulus)
                    .set_poly_modulus_degree(self.metadata.params.lattice_dimension)
                    .set_coefficient_modulus(
                        self.metadata
                            .params
                            .coeff_modulus
                            .iter()
                            .map(|v| Modulus::new(*v).unwrap())
                            .collect::<Vec<Modulus>>(),
                    )
                    .build()?;

                let context =
                    SealContext::new(&bfv_params, true, self.metadata.params.security_level)?;

                Ok(Runtime {
                    context: Context::Seal(context),
                    metadata: self.metadata,
                })
            }
            _ => unimplemented!(),
        }
    }
}
