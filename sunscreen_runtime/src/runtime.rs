use crate::error::*;
use crate::metadata::*;
use crate::{
    run_program_unchecked, Ciphertext, InnerCiphertext, InnerPlaintext, Plaintext, PublicKey,
    SealCiphertext, SealPlaintext, TryFromPlaintext, TryIntoPlaintext, TypeName,
};
use sunscreen_circuit::{SchemeType};

use seal::{
    BFVEvaluator, BfvEncryptionParametersBuilder, Context as SealContext, Decryptor, Encryptor,
    KeyGenerator, Modulus, SecretKey,
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
    params: Params,

    /**
     * The context associated with the BFV scheme.
     */
    context: Context,
}

impl Runtime {
    /**
     * Decrypts the given ciphertext into the type P.
     */
    pub fn decrypt<P>(&self, ciphertext: &Ciphertext, secret_key: &SecretKey) -> Result<P>
    where
        P: TryFromPlaintext + TypeName,
    {
        let expected_type = P::type_name();

        if expected_type != ciphertext.data_type {
            return Err(Error::TypeMismatch {
                expected: expected_type,
                actual: ciphertext.data_type.clone(),
            });
        }

        let val = match (&self.context, &ciphertext.inner) {
            (Context::Seal(context), InnerCiphertext::Seal(ciphertexts)) => {
                let decryptor = Decryptor::new(&context, secret_key)?;

                let plaintexts = ciphertexts
                    .iter()
                    .map(|c| decryptor.decrypt(c).map_err(|e| Error::SealError(e)))
                    .collect::<Result<Vec<SealPlaintext>>>()?;

                P::try_from_plaintext(&Plaintext {
                    inner: InnerPlaintext::Seal(plaintexts),
                }, &self.params)?
            }
        };

        Ok(val)
    }

    /**
     * Generates a tuple of public/private keys for the encapsulated scheme and parameters.
     *
     * # Remarks
     * For some parameters, generating some public key types may fail. For example, Galois
     * keys tend to fail creation for small parameter values. Circuits with small parameters
     * can't require these associated keys and so long as the circuit was compiled using the
     * search algorithm, it won't.
     *
     * See [`PublicKey`] for more information.
     */
    pub fn generate_keys(&self) -> Result<(PublicKey, SecretKey)> {
        let keys = match &self.context {
            Context::Seal(context) => {
                let keygen = KeyGenerator::new(&context)?;

                let public_keys = PublicKey {
                    public_key: keygen.create_public_key(),
                    galois_key: keygen.create_galois_keys().ok(),
                    relin_key: keygen.create_relinearization_keys().ok(),
                };

                (public_keys, keygen.secret_key())
            }
        };

        Ok(keys)
    }

    /**
     * Create a new Runtime.
     */
    pub fn new(params: &Params) -> Result<Self> {
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

                Ok(Self {
                    context: Context::Seal(context),
                    params: params.clone(),
                })
            }
            _ => unimplemented!(),
        }
    }

    /**
     * Returns the metadata for this runtime's associated circuit.
     */
    pub fn params(&self) -> &Params {
        &self.params
    }

    /**
     * Validates and runs the given circuit. Unless you can guarantee your circuit is valid,
     * you should use this method rather than [`run_program_unchecked`].
     */
    pub fn run(
        &self,
        circuit: &CompiledCircuit,
        mut arguments: Vec<Ciphertext>,
        public_key: &PublicKey,
    ) -> Result<Vec<Ciphertext>> {
        circuit.circuit.validate()?;

        // Aside from circuit correctness, check that the required keys are given.
        if public_key.relin_key.is_none() && circuit.circuit.requires_relin_keys() {
            return Err(Error::MissingRelinearizationKeys);
        }

        if public_key.galois_key.is_none() && circuit.circuit.requires_galois_keys() {
            return Err(Error::MissingGaloisKeys);
        }

        let expected_args = &circuit.metadata.signature.arguments;

        if expected_args.len() != arguments.len() {
            return Err(Error::IncorrectCiphertextCount);
        }

        if arguments
            .iter()
            .enumerate()
            .any(|(i, a)| a.data_type != expected_args[i])
        {
            return Err(Error::ArgumentMismatch {
                expected: expected_args.clone(),
                actual: arguments.iter().map(|a| a.data_type.clone()).collect(),
            });
        }

        if circuit.metadata.signature.num_ciphertexts.len()
            != circuit.metadata.signature.returns.len()
        {
            return Err(Error::ReturnTypeMetadataError);
        }

        match &self.context {
            Context::Seal(context) => {
                let evaluator = BFVEvaluator::new(&context)?;

                let mut inputs: Vec<SealCiphertext> = vec![];

                for i in arguments.drain(0..) {
                    match i.inner {
                        InnerCiphertext::Seal(mut c) => {
                            for j in c.drain(0..) {
                                inputs.push(j)
                            }
                        }
                    }
                }

                let mut raw_ciphertexts = unsafe {
                    run_program_unchecked(
                        &circuit.circuit,
                        &inputs,
                        &evaluator,
                        &public_key.relin_key,
                        &public_key.galois_key,
                    )
                }?;

                let mut packed_ciphertexts = vec![];

                for (i, ciphertext_count) in circuit
                    .metadata
                    .signature
                    .num_ciphertexts
                    .iter()
                    .enumerate()
                {
                    packed_ciphertexts.push(Ciphertext {
                        data_type: circuit.metadata.signature.returns[i].clone(),
                        inner: InnerCiphertext::Seal(
                            raw_ciphertexts.drain(0..*ciphertext_count).collect(),
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
        let plaintext = val.try_into_plaintext(&self.params)?;

        let ciphertext = match (&self.context, plaintext.inner) {
            (Context::Seal(context), InnerPlaintext::Seal(inner_plain)) => {
                let encryptor = Encryptor::with_public_key(context, &public_key.public_key)?;

                let ciphertexts = inner_plain
                    .iter()
                    .map(|p| encryptor.encrypt(p).map_err(|e| Error::SealError(e)))
                    .collect::<Result<Vec<SealCiphertext>>>()?;

                Ciphertext {
                    data_type: P::type_name(),
                    inner: InnerCiphertext::Seal(ciphertexts),
                }
            }
        };

        Ok(ciphertext)
    }
}
