//! This module contains various builders for ZKPs, SDLPs, and linked proofs.

use sunscreen_zkp_backend::{Proof, ZkpBackend};

use crate::{marker, CompiledZkpProgram, GenericRuntime, Params, Result, ZkpProgramInput};

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
    use seal_fhe::SecurityLevel;
    use sunscreen_compiler_common::{Type, TypeName};
    use sunscreen_math::ring::{BarrettBackend, BarrettConfig, Zq};
    use sunscreen_zkp_backend::{
        bulletproofs::{BulletproofsBackend, BulletproofsFieldSpec},
        FieldSpec,
    };

    use crate::{
        marker, Ciphertext, CompiledZkpProgram, GenericRuntime, LinkedProof, NumCiphertexts,
        Params, Plaintext, PrivateKey, PublicKey, Result, Sdlp, SealSdlpProverKnowledge,
        TryIntoPlaintext, ZkpProgramInput,
    };

    /// All FHE plaintext types can be used in a [`Sdlp`]. This trait indicates further that a
    /// plaintext type can be linked between the SDLP and a ZKP program.
    pub trait LinkWithZkp: NumCiphertexts {
        /// The associated ZKP input type when this plaintext is linked with a ZKP program.
        type ZkpType<F: FieldSpec>: TypeName;

        /// The number of nonzero coefficients to link between the SDLP and ZKP.
        ///
        /// Note that many FHE plaintext types are encoded into polynomials with a flavor of binary
        /// or 2s complement encoding; that is, as coefficients of powers of 2. In this case, the
        /// `DEGREE_BOUND` must be chosen carefully to ensure that the field elements don't
        /// overflow.
        ///
        /// For example, if you include 256 coefficients of a plaintext polynomial encoding a
        /// `Signed` value, the ZKP circuit will attempt to multiply the last coefficient by
        /// `2^{256}`. If using the bulletproofs backend, the `Scalar` type backing the field
        /// elements is only a 256-bit integer, and will overflow! So, set this value carefully
        /// depending on the plaintext encoding and field element decoding logic.
        const DEGREE_BOUND: usize;
    }

    #[derive(Debug, Clone)]
    /// We pass this around for both plain and linked messages, as we need both the plaintext and
    /// its type information to perform encryption.
    ///
    /// Essentially we store the output from TryIntoPlaintext and TypeName.
    pub(crate) struct PlaintextTyped {
        plaintext: Plaintext,
        type_name: Type,
    }

    /// We pass this around for just linked messages, as also need the zkp type information.
    ///
    /// Essentially we store the output from LinkWithZkp
    #[derive(Debug, Clone)]
    pub(crate) struct LinkedPlaintextTyped {
        plaintext_typed: PlaintextTyped,
        zkp_type: Type,
    }

    /// A [`Plaintext`] message that can be linked. Create this with [`LogProofBuilder::encrypt_and_link`].
    #[derive(Debug)]
    pub struct LinkedMessage {
        pub(crate) id: usize,
        pub(crate) message: Arc<LinkedPlaintextTyped>,
        pub(crate) len: usize,
    }

    impl LinkedMessage {
        // Only allow cloning internally.
        fn clone(&self) -> Self {
            LinkedMessage {
                id: self.id,
                message: self.message.clone(),
                len: self.len,
            }
        }
    }

    enum Message {
        Plain(PlaintextTyped),
        Linked(LinkedMessage),
    }

    enum Key<'a> {
        Public(&'a PublicKey),
        Private(&'a PrivateKey),
    }

    impl Message {
        fn pt_typed(&self) -> &PlaintextTyped {
            match self {
                Message::Plain(m) => m,
                Message::Linked(m) => &m.message.plaintext_typed,
            }
        }
        fn pt(&self) -> &Plaintext {
            &self.pt_typed().plaintext
        }
        fn type_name(&self) -> &Type {
            &self.pt_typed().type_name
        }
        fn linked_id(&self) -> Option<usize> {
            match self {
                Message::Linked(LinkedMessage { id, .. }) => Some(*id),
                _ => None,
            }
        }
    }

    // Infallible since we've already obtained the plaintext
    impl TryIntoPlaintext for Message {
        fn try_into_plaintext(&self, _params: &Params) -> Result<Plaintext> {
            Ok(self.pt().clone())
        }
    }

    // Forward to the underlying plaintext type
    impl crate::TypeNameInstance for Message {
        fn type_name_instance(&self) -> Type {
            self.type_name().clone()
        }
    }

    /// A builder for [`Sdlp`] or [`LinkedProof`].
    ///
    /// Use this builder to encrypt your [`Plaintext`]s while automatically generate a log proof of the
    /// encryption statements. We implicitly assume that these plaintexts and ciphertexts are backed by
    /// the SEAL BFV scheme, otherwise the methods will return an `Err`.
    pub struct LogProofBuilder<'r, 'k, 'z, M, B> {
        runtime: &'r GenericRuntime<M, B>,

        // log proof fields
        statements: Vec<BfvProofStatement<'k>>,
        messages: Vec<BfvMessage>,
        witness: Vec<BfvWitness<'k>>,

        // linked proof fields
        compiled_zkp_program: Option<&'z CompiledZkpProgram>,
        linked_inputs: Vec<LinkedMessage>,
        private_inputs: Vec<ZkpProgramInput>,
        public_inputs: Vec<ZkpProgramInput>,
        constant_inputs: Vec<ZkpProgramInput>,
    }

    impl<'r, 'k, 'z, M: marker::Fhe, Z> LogProofBuilder<'r, 'k, 'z, M, Z> {
        /// Create a new [`LogProofBuilder`].
        pub fn new(runtime: &'r GenericRuntime<M, Z>) -> Self {
            Self {
                runtime,
                statements: vec![],
                messages: vec![],
                witness: vec![],
                compiled_zkp_program: None,
                linked_inputs: vec![],
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
            self.encrypt_asymmetric_internal(Message::Plain(pt), public_key, None)
        }

        /// Encrypt a plaintext symmetrically, adding the encryption statement to the proof.
        ///
        /// If you do not want to add the encryption statement to the proof, just use [the
        /// runtime](`crate::GenericRuntime::encrypt_symmetric`) directly.
        pub fn encrypt_symmetric<P>(
            &mut self,
            message: &P,
            private_key: &'k PrivateKey,
        ) -> Result<Ciphertext>
        where
            P: TryIntoPlaintext + TypeName,
        {
            let pt = self.plaintext_typed(message)?;
            self.encrypt_symmetric_internal(Message::Plain(pt), private_key, None)
        }

        /// Encrypt a plaintext intended for sharing.
        ///
        /// The returned `LinkedMessage` can be used:
        /// 1. to add an encryption statement of ciphertext equality to the proof (see [`Self::encrypt_linked`]).
        /// 2. as a linked input to a ZKP program (see [`Self::linked_input`]).
        pub fn encrypt_and_link<P>(
            &mut self,
            message: &P,
            public_key: &'k PublicKey,
        ) -> Result<(Ciphertext, LinkedMessage)>
        where
            P: LinkWithZkp + TryIntoPlaintext + TypeName,
        {
            self.encrypt_and_link_internal(message, Key::Public(public_key))
        }

        /// Symmetrically encrypt a plaintext intended for sharing.
        ///
        /// The returned `LinkedMessage` can be used:
        /// 1. to add an encryption statement of ciphertext equality to the proof (see [`Self::encrypt_linked`]).
        /// 2. as a linked input to a ZKP program (see [`Self::linked_input`]).
        pub fn encrypt_symmetric_and_link<P>(
            &mut self,
            message: &P,
            private_key: &'k PrivateKey,
        ) -> Result<(Ciphertext, LinkedMessage)>
        where
            P: LinkWithZkp + TryIntoPlaintext + TypeName,
        {
            self.encrypt_and_link_internal(message, Key::Private(private_key))
        }

        fn encrypt_and_link_internal<P>(
            &mut self,
            message: &P,
            key: Key<'k>,
        ) -> Result<(Ciphertext, LinkedMessage)>
        where
            P: LinkWithZkp + TryIntoPlaintext + TypeName,
        {
            // The user intends to link this message, so add a more conservative bound
            let plaintext_typed = self.plaintext_typed(message)?;
            let idx_start = self.messages.len();
            let ct = match key {
                Key::Public(public_key) => self.encrypt_asymmetric_internal(
                    Message::Plain(plaintext_typed.clone()),
                    public_key,
                    Some(self.mk_bounds::<P>()),
                ),
                Key::Private(private_key) => self.encrypt_symmetric_internal(
                    Message::Plain(plaintext_typed.clone()),
                    private_key,
                    Some(self.mk_bounds::<P>()),
                ),
            }?;
            let idx_end = self.messages.len();
            // TODO shouldn't be assuming bulletproofs here...
            // need to separate the notion of sharing duplicate messages and sharing to ZKP
            let zkp_type = P::ZkpType::<BulletproofsFieldSpec>::type_name();
            let linked_message = LinkedMessage {
                id: idx_start,
                message: Arc::new(LinkedPlaintextTyped {
                    plaintext_typed,
                    zkp_type,
                }),
                len: idx_end - idx_start,
            };
            Ok((ct, linked_message))
        }

        /// Encrypt a linked message, adding the new encryption statement to the proof.
        ///
        /// This method purposefully reveals that two ciphertexts enrypt the same underlying value. If
        /// this is not what you want, use [`Self::encrypt`].
        ///
        /// This method assumes that you've created the `message` argument with _this_ builder.
        pub fn encrypt_linked(
            &mut self,
            message: &LinkedMessage,
            public_key: &'k PublicKey,
        ) -> Result<Ciphertext> {
            // The existing message already has bounds, no need to recompute them.
            let bounds = None;
            self.encrypt_asymmetric_internal(Message::Linked(message.clone()), public_key, bounds)
        }

        /// Encrypt a linked message symmetrically, adding the new encryption statement to the
        /// proof.
        ///
        /// This method purposefully reveals that two ciphertexts enrypt the same underlying value. If
        /// this is not what you want, use [`Self::encrypt`].
        ///
        /// This method assumes that you've created the `message` argument with _this_ builder.
        pub fn encrypt_symmetric_linked(
            &mut self,
            message: &LinkedMessage,
            private_key: &'k PrivateKey,
        ) -> Result<Ciphertext> {
            // The existing message already has bounds, no need to recompute them.
            let bounds = None;
            self.encrypt_symmetric_internal(Message::Linked(message.clone()), private_key, bounds)
        }

        fn encrypt_asymmetric_internal(
            &mut self,
            message: Message,
            public_key: &'k PublicKey,
            bounds: Option<Bounds>,
        ) -> Result<Ciphertext> {
            let existing_idx = message.linked_id();
            let mut i = 0;
            self.runtime
                .encrypt_map_components(&message, public_key, |m, ct, components| {
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
                            public_key: Cow::Borrowed(&public_key.public_key.data),
                        });
                    self.witness
                        .push(BfvWitness::PublicKeyEncryption(components));
                    i += 1;
                })
        }

        fn encrypt_symmetric_internal(
            &mut self,
            message: Message,
            private_key: &'k PrivateKey,
            bounds: Option<Bounds>,
        ) -> Result<Ciphertext> {
            let existing_idx = message.linked_id();
            let mut i = 0;
            self.runtime.encrypt_symmetric_map_components(
                &message,
                private_key,
                |m, ct, components| {
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
                        .push(BfvProofStatement::PrivateKeyEncryption {
                            message_id,
                            ciphertext: ct.clone(),
                        });
                    self.witness.push(BfvWitness::PrivateKeyEncryption {
                        private_key: Cow::Borrowed(&private_key.0.data),
                        components,
                    });
                    i += 1;
                },
            )
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

        /// Build the [`Sdlp`] for the statements added to this builder.
        ///
        /// You can use this as a standalone proof, or alternatively see
        /// [`Self::build_linkedproof`] to prove additional properties about the underlying
        /// plaintexts.
        pub fn build_logproof(&self) -> Result<Sdlp> {
            Sdlp::create(&self.build_sdlp_pk()?)
        }

        fn build_sdlp_pk(&self) -> Result<SealSdlpProverKnowledge> {
            let params = self.runtime.params();
            match (params.lattice_dimension, params.security_level) {
                (1024, SecurityLevel::TC128) => Ok(SealSdlpProverKnowledge::from(
                    self.build_sdlp_pk_generic::<1, SealQ128_1024>()?,
                )),
                (2048, SecurityLevel::TC128) => Ok(SealSdlpProverKnowledge::from(
                    self.build_sdlp_pk_generic::<1, SealQ128_2048>()?,
                )),
                (4096, SecurityLevel::TC128) => Ok(SealSdlpProverKnowledge::from(
                    self.build_sdlp_pk_generic::<2, SealQ128_4096>()?,
                )),
                (8192, SecurityLevel::TC128) => Ok(SealSdlpProverKnowledge::from(
                    self.build_sdlp_pk_generic::<3, SealQ128_8192>()?,
                )),
                _ => Err(BuilderError::UnsupportedParameters(Box::new(params.clone())).into()),
            }
        }

        fn build_sdlp_pk_generic<const N: usize, B: BarrettConfig<N>>(
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

        fn mk_bounds<P: LinkWithZkp>(&self) -> Bounds {
            let params = self.runtime.params();
            let mut bounds = vec![params.plain_modulus; P::DEGREE_BOUND];
            bounds.resize(params.lattice_dimension as usize, 0);
            Bounds(bounds)
        }
    }

    impl<'r, 'k, 'z, M: marker::Fhe + marker::Zkp> LogProofBuilder<'r, 'k, 'z, M, BulletproofsBackend> {
        /// Add a ZKP program to be linked with the logproof.
        ///
        /// This method is required to call [`Self::build_linkedproof`].
        pub fn zkp_program(&mut self, program: &'z CompiledZkpProgram) -> Result<&mut Self> {
            let params = program.metadata.params.as_ref().ok_or_else(|| {
                BuilderError::user_error(
                    "Cannot link a ZKP program without associated FHE parameters. Make sure your ZKP program has #[linked] parameters and is compiled alongside an FHE program.",
                )
            })?;
            if params != self.runtime.params() {
                return Err(BuilderError::user_error(
                    "The FHE parameters of the ZKP program do not match the FHE parameters of the runtime.",
                ));
            }
            self.compiled_zkp_program = Some(program);
            Ok(self)
        }

        /// Add a linked private input to the ZKP program.
        ///
        /// This method assumes that you've created the `message` argument with _this_ builder.
        pub fn linked_input(&mut self, message: LinkedMessage) -> &mut Self {
            self.linked_inputs.push(message);
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
            let sdlp = self.build_sdlp_pk()?;
            let program = self.compiled_zkp_program.ok_or_else(|| {
                BuilderError::user_error("Cannot build linked proof without a compiled ZKP program. Use the `.zkp_program()` method")
            })?;
            let linked_indices = self
                .linked_inputs
                .iter()
                .flat_map(|m| (m.id..m.id + m.len).map(|ix| (ix, 0)))
                .collect::<Vec<_>>();
            let linked_types = self
                .linked_inputs
                .iter()
                .map(|m| m.message.zkp_type.clone())
                .collect::<Vec<_>>();

            LinkedProof::create(
                &sdlp,
                &linked_indices,
                &linked_types,
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
}
