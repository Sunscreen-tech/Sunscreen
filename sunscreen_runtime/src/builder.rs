//! This module various builders.

use merlin::Transcript;
use sunscreen_zkp_backend::{CompiledZkpProgram, Proof, ZkpBackend};

use crate::{marker, GenericRuntime, Params, Result, ZkpProgramInput};

/// Errors that can occur when building a log proof or linked proof.
#[derive(PartialEq, Eq, Debug, Clone, thiserror::Error)]
pub enum BuilderError {
    /// An error with the ZKP proving.
    #[error("These FHE parameters are not supported by logproof: {0:?}")]
    UnsupportedParameters(Box<Params>),

    /// An error generating the runtime.
    #[error("Invalid usage: {0}")]
    InvalidUsage(Box<String>),
}

impl BuilderError {
    fn user_error(msg: impl Into<String>) -> crate::Error {
        Self::InvalidUsage(Box::new(msg.into())).into()
    }
}

/// A builder for creating a ZKP.
///
/// This is offered as a convenience for building the arguments necessary for the
/// [`prove`][GenericRuntime::prove] function.
pub struct ProofBuilder<'r, 'p, T: marker::Zkp, B: ZkpBackend> {
    runtime: &'r GenericRuntime<T, B>,
    program: &'p CompiledZkpProgram,
    private_inputs: Vec<ZkpProgramInput>,
    public_inputs: Vec<ZkpProgramInput>,
    constant_inputs: Vec<ZkpProgramInput>,
}

impl<'r, 'p, T: marker::Zkp, B: ZkpBackend> ProofBuilder<'r, 'p, T, B> {
    /// Create a new `ProofBuilder`. It's typically more convenient to create a proof builder
    /// via [`runtime.proof_builder()`][GenericRuntime::proof_builder].
    pub fn new(runtime: &'r GenericRuntime<T, B>, program: &'p CompiledZkpProgram) -> Self
    where
        T: marker::Zkp,
        B: ZkpBackend,
    {
        Self {
            runtime,
            program,
            private_inputs: vec![],
            public_inputs: vec![],
            constant_inputs: vec![],
        }
    }

    /// Add a constant input to the proof builder.
    pub fn constant_input(mut self, input: impl Into<ZkpProgramInput>) -> Self {
        self.constant_inputs.push(input.into());
        self
    }

    /// Add multiple constant inputs to the proof builder.
    pub fn constant_inputs<I>(mut self, inputs: I) -> Self
    where
        I: IntoIterator<Item = T>,
        ZkpProgramInput: From<T>,
    {
        self.constant_inputs
            .extend(inputs.into_iter().map(ZkpProgramInput::from));
        self
    }

    /// Add a public input to the proof builder.
    pub fn public_input(mut self, input: impl Into<ZkpProgramInput>) -> Self {
        self.public_inputs.push(input.into());
        self
    }

    /// Add multiple public inputs to the proof builder.
    pub fn public_inputs<I>(mut self, inputs: I) -> Self
    where
        I: IntoIterator<Item = T>,
        ZkpProgramInput: From<T>,
    {
        self.public_inputs
            .extend(inputs.into_iter().map(ZkpProgramInput::from));
        self
    }

    /// Add a private input to the proof builder.
    pub fn private_input(mut self, input: impl Into<ZkpProgramInput>) -> Self {
        self.private_inputs.push(input.into());
        self
    }

    /// Add multiple private inputs to the proof builder.
    pub fn private_inputs<I>(mut self, inputs: I) -> Self
    where
        I: IntoIterator<Item = T>,
        ZkpProgramInput: From<T>,
    {
        self.private_inputs
            .extend(inputs.into_iter().map(ZkpProgramInput::from));
        self
    }

    /// Generate a proof; see [`runtime.prove()`][GenericRuntime::prove].
    pub fn prove(self) -> Result<Proof> {
        self.runtime.prove(
            self.program,
            self.private_inputs,
            self.public_inputs,
            self.constant_inputs,
        )
    }

    /// Generate a proof with parameters for that proof system; see
    /// [`runtime.prove_with_parameters()`][GenericRuntime::prove_with_parameters].
    pub fn prove_with_parameters(
        self,
        parameters: &B::ProverParameters,
        transcript: &mut Transcript,
    ) -> Result<Proof> {
        self.runtime.prove_with_parameters(
            self.program,
            self.private_inputs,
            self.public_inputs,
            self.constant_inputs,
            parameters,
            transcript,
        )
    }
}

/// A builder for verifying a proof.
///
/// This is offered as a convenience for building the arguments necessary for the
/// [`verify`][GenericRuntime::verify] function.
pub struct VerificationBuilder<'r, 'p, 'a, T: marker::Zkp, B: ZkpBackend> {
    runtime: &'r GenericRuntime<T, B>,
    program: &'p CompiledZkpProgram,
    proof: Option<&'a Proof>,
    constant_inputs: Vec<ZkpProgramInput>,
    public_inputs: Vec<ZkpProgramInput>,
}

impl<'r, 'p, 'a, T: marker::Zkp, B: ZkpBackend> VerificationBuilder<'r, 'p, 'a, T, B> {
    /// Create a new `VerificationBuilder`. It's typically more convenient to create a
    /// verification builder via
    /// [`runtime.verification_builder()`][GenericRuntime::verification_builder].
    pub fn new(runtime: &'r GenericRuntime<T, B>, program: &'p CompiledZkpProgram) -> Self
    where
        T: marker::Zkp,
        B: ZkpBackend,
    {
        Self {
            runtime,
            program,
            proof: None,
            public_inputs: vec![],
            constant_inputs: vec![],
        }
    }

    /// Add the proof to verify.
    pub fn proof(mut self, proof: &'a Proof) -> Self {
        self.proof = Some(proof);
        self
    }

    /// Add a constant input to the verification builder.
    pub fn constant_input(mut self, input: impl Into<ZkpProgramInput>) -> Self {
        self.constant_inputs.push(input.into());
        self
    }

    /// Add multiple constant inputs to the verification builder.
    pub fn constant_inputs<I>(mut self, inputs: I) -> Self
    where
        I: IntoIterator<Item = T>,
        ZkpProgramInput: From<T>,
    {
        self.constant_inputs
            .extend(inputs.into_iter().map(ZkpProgramInput::from));
        self
    }

    /// Add a public input to the verification builder.
    pub fn public_input(mut self, input: impl Into<ZkpProgramInput>) -> Self {
        self.public_inputs.push(input.into());
        self
    }

    /// Add multiple public inputs to the verification builder.
    pub fn public_inputs<I>(mut self, inputs: I) -> Self
    where
        I: IntoIterator<Item = T>,
        ZkpProgramInput: From<T>,
    {
        self.public_inputs
            .extend(inputs.into_iter().map(ZkpProgramInput::from));
        self
    }

    /// Verify that `self.proof` satisfies `self.program`; see
    /// [`runtime.verify()`][GenericRuntime::verify].
    ///
    /// # Remarks
    /// Will error if the underlying `verify` call errors, or if a proof has not yet been
    /// supplied to the builder. That is, you must call [`Self::proof`] before calling this
    /// function.
    pub fn verify(self) -> Result<()> {
        let proof = self.proof.ok_or_else(|| {
            BuilderError::user_error(
                "You must supply a proof to the verification builder before calling `verify`",
            )
        })?;
        self.runtime.verify(
            self.program,
            proof,
            self.public_inputs,
            self.constant_inputs,
        )
    }
}

#[cfg(feature = "linkedproofs")]
pub use linked::*;

#[cfg(feature = "linkedproofs")]
mod linked {
    use super::BuilderError;

    use std::{borrow::Cow, sync::Arc};

    use logproof::{
        bfv_statement::{self, BfvMessage, BfvProofStatement, BfvWitness, StatementParams},
        rings::{SealQ128_1024, SealQ128_2048, SealQ128_4096, SealQ128_8192},
        Bounds, LogProofProverKnowledge,
    };
    use seal_fhe as seal;
    use seal_fhe::SecurityLevel;
    use sunscreen_compiler_common::{Type, TypeName};
    use sunscreen_math::ring::{BarrettBackend, BarrettConfig, Zq};
    use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, CompiledZkpProgram};

    use crate::{
        marker, BFVEncryptionComponents, Ciphertext, GenericRuntime, LinkedProof, NumCiphertexts,
        Params, Plaintext, PublicKey, Result, SealSdlpProverKnowledge, TryIntoPlaintext,
        ZkpProgramInput,
    };

    /// A trait for sharing a plaintext with a ZKP program.
    pub trait ShareWithZKP: NumCiphertexts {
        /// The number of nonzero coefficients to share between the SDLP and ZKP.
        ///
        /// Note that when plaintexts polynomials are shared with ZKP programs, the ZKP program
        /// assumes the coefficients form a 2s complement encoding. Without this bound, all
        /// coefficients (up to the lattice degree `N`) are shared and thus the ZKP circuit has to
        /// compute `2^N`. Of course, each ZKP field element is limited by its underlying
        /// representation (e.g. a 256-bit scalar for Bulletproofs). Thus, any encoding should keep
        /// this limit this in mind.
        ///
        /// This number should be less than 256.
        const DEGREE_BOUND: usize;
    }

    #[derive(Debug, Clone)]
    pub(crate) struct PlaintextTyped {
        plaintext: Plaintext,
        type_name: Type,
    }

    /// A [`Plaintext`] message that can be shared. Create this with [`LogProofBuilder::share`].
    #[derive(Debug, Clone)]
    pub struct SharedMessage {
        pub(crate) id: usize,
        pub(crate) message: Arc<PlaintextTyped>,
        pub(crate) len: usize,
    }

    enum Message {
        Plain(PlaintextTyped),
        Shared(SharedMessage),
    }

    impl Message {
        fn pt_typed(&self) -> &PlaintextTyped {
            match self {
                Message::Plain(m) => m,
                Message::Shared(m) => &m.message,
            }
        }
        fn pt(&self) -> &Plaintext {
            &self.pt_typed().plaintext
        }
        fn type_name(&self) -> &Type {
            &self.pt_typed().type_name
        }
        fn shared_id(&self) -> Option<usize> {
            match self {
                Message::Shared(SharedMessage { id, .. }) => Some(*id),
                _ => None,
            }
        }
    }

    /// A builder for [`LogProofProverKnowledge`] or [`LogProofVerifierKnowledge`].
    ///
    /// Use this builder to encrypt your [`Plaintext`]s while automatically generate a log proof of the
    /// encryption statements. We implicitly assume that these plaintexts and ciphertexts are backed by
    /// the SEAL BFV scheme, otherwise the methods will return an `Err`.
    pub struct LogProofBuilder<'r, 'k, 'w, 'z, M, B> {
        runtime: &'r GenericRuntime<M, B>,

        // log proof fields
        statements: Vec<BfvProofStatement<seal::Ciphertext, &'k seal::PublicKey>>,
        messages: Vec<BfvMessage>,
        witness: Vec<BfvWitness<'w, 'k>>,

        // linked proof fields
        compiled_zkp_program: Option<&'z CompiledZkpProgram>,
        shared_inputs: Vec<SharedMessage>,
        private_inputs: Vec<ZkpProgramInput>,
        public_inputs: Vec<ZkpProgramInput>,
        constant_inputs: Vec<ZkpProgramInput>,
    }

    impl<'r, 'k, 'w, 'z, M: marker::Fhe, Z> LogProofBuilder<'r, 'k, 'w, 'z, M, Z> {
        /// Create a new [`LogProofBuilder`].
        pub fn new(runtime: &'r GenericRuntime<M, Z>) -> Self {
            Self {
                runtime,
                statements: vec![],
                messages: vec![],
                witness: vec![],
                compiled_zkp_program: None,
                shared_inputs: vec![],
                private_inputs: vec![],
                public_inputs: vec![],
                constant_inputs: vec![],
            }
        }

        /// Encrypt a plaintext, adding the encryption statement to the proof.
        ///
        /// If you do not want to add the encryption statement to the proof, just use [the
        /// runtime](`crate::GenericRuntime::encrypt`) directly.
        pub fn encrypt<P>(&mut self, message: &P, public_key: &'k PublicKey) -> Result<Ciphertext>
        where
            P: TryIntoPlaintext + TypeName,
        {
            let pt = self.plaintext_typed(message)?;
            self.encrypt_internal(Message::Plain(pt), public_key, None)
        }

        /// Encrypt a plaintext intended for sharing.
        ///
        /// The returned `SharedMessage` can be used:
        /// 1. to add an encryption statement of ciphertext equality to the proof (see [`Self::encrypt_shared`]).
        /// 2. as a shared input to a ZKP program (see [`Self::shared_input`]).
        pub fn encrypt_and_share<P>(
            &mut self,
            message: &P,
            public_key: &'k PublicKey,
        ) -> Result<(Ciphertext, SharedMessage)>
        where
            P: ShareWithZKP + TryIntoPlaintext + TypeName,
        {
            // The user intends to share this message, so add a more conservative bound
            let pt = self.plaintext_typed(message)?;
            let idx_start = self.messages.len();
            let ct = self.encrypt_internal(
                Message::Plain(pt.clone()),
                public_key,
                Some(self.mk_bounds::<P>()),
            )?;
            let idx_end = self.messages.len();
            let shared_message = SharedMessage {
                id: idx_start,
                message: Arc::new(pt),
                len: idx_end - idx_start,
            };
            Ok((ct, shared_message))
        }

        /// Encrypt a shared message, adding the new encryption statement to the proof.
        ///
        /// This method purposefully reveals that two ciphertexts enrypt the same underlying value. If
        /// this is not what you want, use [`Self::encrypt`].
        ///
        /// This method assumes that you've created the `message` argument with _this_ builder.
        pub fn encrypt_shared(
            &mut self,
            message: &SharedMessage,
            public_key: &'k PublicKey,
        ) -> Result<Ciphertext> {
            // The existing message already has bounds, no need to recompute them.
            let bounds = None;
            self.encrypt_internal(Message::Shared(message.clone()), public_key, bounds)
        }

        fn encrypt_internal(
            &mut self,
            message: Message,
            public_key: &'k PublicKey,
            bounds: Option<Bounds>,
        ) -> Result<Ciphertext> {
            let enc_components = self.runtime.encrypt_return_components_switched_internal(
                message.pt(),
                message.type_name(),
                public_key,
                true,
                None,
            )?;
            let existing_idx = message.shared_id();

            for (i, AsymmetricEncryption { ct, u, e, r, m }) in
                zip_seal_pieces(&enc_components, message.pt())?.enumerate()
            {
                let message_id = if let Some(idx) = existing_idx {
                    idx + i
                } else {
                    let idx = self.messages.len();
                    self.messages.push(BfvMessage {
                        plaintext: m.clone(),
                        bounds: bounds.clone(),
                    });
                    idx
                };
                self.statements
                    .push(BfvProofStatement::PublicKeyEncryption {
                        message_id,
                        ciphertext: ct.clone(),
                        public_key: &public_key.public_key.data,
                    });
                self.witness.push(BfvWitness::PublicKeyEncryption {
                    u: Cow::Owned(u),
                    e: Cow::Owned(e),
                    r: Cow::Owned(r.clone()),
                });
            }
            Ok(enc_components.ciphertext)
        }

        fn plaintext_typed<P>(&self, pt: &P) -> Result<PlaintextTyped>
        where
            P: TryIntoPlaintext + TypeName,
        {
            Ok(PlaintextTyped {
                plaintext: pt.try_into_plaintext(self.runtime.params())?,
                type_name: P::type_name(),
            })
        }

        /// Build the [`SealSdlpProverKnowledge`] for the statements added to this builder.
        ///
        /// You can use this to create a [`crate::linked::LinkedProof`] if you have enabled the
        /// `linkedproofs` feature. If you have constructed this builder with a ZKP capable runtime
        /// and bulletproofs backend, you may also wish to use the available linkedproof methods on
        /// this builder.
        pub fn build_logproof(&self) -> Result<SealSdlpProverKnowledge> {
            let params = self.runtime.params();
            match (params.lattice_dimension, params.security_level) {
                (1024, SecurityLevel::TC128) => Ok(SealSdlpProverKnowledge::from(
                    self.build_generic_logproof::<1, SealQ128_1024>()?,
                )),
                (2048, SecurityLevel::TC128) => Ok(SealSdlpProverKnowledge::from(
                    self.build_generic_logproof::<1, SealQ128_2048>()?,
                )),
                (4096, SecurityLevel::TC128) => Ok(SealSdlpProverKnowledge::from(
                    self.build_generic_logproof::<2, SealQ128_4096>()?,
                )),
                (8192, SecurityLevel::TC128) => Ok(SealSdlpProverKnowledge::from(
                    self.build_generic_logproof::<3, SealQ128_8192>()?,
                )),
                _ => Err(BuilderError::UnsupportedParameters(Box::new(params.clone())).into()),
            }
        }

        fn build_generic_logproof<const N: usize, B: BarrettConfig<N>>(
            &self,
        ) -> Result<LogProofProverKnowledge<Zq<N, BarrettBackend<N, B>>>> {
            let params = self.runtime.params();
            let ctx = self.runtime.context();
            Ok(bfv_statement::generate_prover_knowledge(
                &self.statements,
                &self.messages,
                &self.witness,
                params,
                ctx,
            ))
        }

        fn mk_bounds<P: ShareWithZKP>(&self) -> Bounds {
            let params = self.runtime.params();
            let mut bounds = vec![params.plain_modulus; P::DEGREE_BOUND];
            bounds.resize(params.lattice_dimension as usize, 0);
            Bounds(bounds)
        }
    }

    impl<'r, 'p, 's, 'z, M: marker::Fhe + marker::Zkp>
        LogProofBuilder<'r, 'p, 's, 'z, M, BulletproofsBackend>
    {
        /// Add a ZKP program to be linked with the logproof.
        ///
        /// This method is required to call [`Self::build_linkedproof`].
        pub fn zkp_program(&mut self, program: &'z CompiledZkpProgram) -> &mut Self {
            self.compiled_zkp_program = Some(program);
            self
        }

        /// Add a shared private input to the ZKP program.
        ///
        /// This method assumes that you've created the `message` argument with _this_ builder.
        pub fn shared_input(&mut self, message: &SharedMessage) -> &mut Self {
            self.shared_inputs.push(message.clone());
            self
        }

        /// Add a private input to the ZKP program.
        pub fn private_input(&mut self, input: impl Into<ZkpProgramInput>) -> &mut Self {
            self.private_inputs.push(input.into());
            self
        }

        /// Add a public input to the ZKP program.
        pub fn public_input(&mut self, input: impl Into<ZkpProgramInput>) -> &mut Self {
            self.public_inputs.push(input.into());
            self
        }

        /// Add a constant input to the proof builder.
        pub fn constant_input(&mut self, input: impl Into<ZkpProgramInput>) -> &mut Self {
            self.constant_inputs.push(input.into());
            self
        }

        /// Output a [`LinkedProof`] from the encryption statements and ZKP program and inputs added to
        /// this builder.
        pub fn build_linkedproof(&mut self) -> Result<crate::linked::LinkedProof> {
            let sdlp = self.build_logproof()?;
            let program = self.compiled_zkp_program.ok_or_else(|| {
                BuilderError::user_error("Cannot build linked proof without a compiled ZKP program. Use the `.zkp_program()` method")
            })?;
            let shared_indices = self
                .shared_inputs
                .iter()
                .flat_map(|m| (m.id..m.id + m.len).map(|ix| (ix, 0)))
                .collect::<Vec<_>>();

            LinkedProof::create(
                &sdlp,
                &shared_indices,
                program,
                self.private_inputs.clone(),
                self.public_inputs.clone(),
                self.constant_inputs.clone(),
            )
        }
    }

    impl StatementParams for Params {
        fn degree(&self) -> u64 {
            self.lattice_dimension
        }

        fn plain_modulus(&self) -> u64 {
            self.plain_modulus
        }

        fn ciphertext_modulus(&self) -> Vec<u64> {
            self.coeff_modulus.clone()
        }
    }

    // Helper struct when decomposing the encryption pieces.
    struct AsymmetricEncryption<'a> {
        ct: &'a seal::Ciphertext,
        u: seal::PolynomialArray,
        e: seal::PolynomialArray,
        r: &'a seal::Plaintext,
        m: &'a seal::Plaintext,
    }

    fn zip_seal_pieces<'a>(
        enc_components: &'a BFVEncryptionComponents,
        pt: &'a Plaintext,
    ) -> Result<impl Iterator<Item = AsymmetricEncryption<'a>>> {
        let seal_cts = enc_components
            .ciphertext
            .inner_as_seal_ciphertext()?
            .iter()
            .map(|ct| &ct.data);
        let seal_pts = pt.inner_as_seal_plaintext()?.iter();
        let us = enc_components.u.clone().into_iter();
        let es = enc_components.e.clone().into_iter();
        let rs = enc_components
            .r
            .iter()
            .map(|r| &r.inner_as_seal_plaintext().unwrap()[0].data);
        Ok(seal_cts
            .zip(seal_pts)
            .zip(us)
            .zip(es)
            .zip(rs)
            .map(|((((ct, pt), u), e), r)| AsymmetricEncryption { ct, u, e, r, m: pt }))
    }
}
