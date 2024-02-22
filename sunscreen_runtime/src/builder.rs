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
pub use linked::{
    ExistingMessage, LinkWithZkp, LinkedMessage, LinkedProofBuilder, LogProofBuilder, Message,
    SdlpBuilder,
};

#[cfg(feature = "linkedproofs")]
mod linked {
    use super::BuilderError;

    use std::{borrow::Cow, sync::Arc};

    use logproof::{
        bfv_statement::{self, BfvMessage, BfvProofStatement, BfvWitness, StatementParams},
        math::Log2,
        rings::{SealQ128_1024, SealQ128_2048, SealQ128_4096, SealQ128_8192},
        Bounds, LogProofProverKnowledge,
    };
    use sunscreen_compiler_common::{Type, TypeName};
    use sunscreen_math::ring::{BarrettBackend, BarrettConfig, Zq};
    use sunscreen_zkp_backend::{
        bulletproofs::{BulletproofsBackend, BulletproofsFieldSpec},
        FieldSpec,
    };

    use crate::{
        marker, Ciphertext, CompiledZkpProgram, Fhe, FheRuntime, FheZkp, FheZkpRuntime,
        GenericRuntime, LinkedProof, NumCiphertexts, Params, Plaintext, PrivateKey, PublicKey,
        Result, Sdlp, SealSdlpProverKnowledge, TryFromPlaintext, TryIntoPlaintext, ZkpProgramInput,
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

    /// We pass this around for both plain and linked messages. This type exists because we need
    /// both the plaintext and its type information to perform encryption.
    ///
    /// Essentially we store the output from TryIntoPlaintext and TypeName.
    #[derive(Debug, Clone)]
    struct PlaintextTyped {
        plaintext: Plaintext,
        type_name: Type,
    }

    /// This is the internal type used for existing messages which have been added to the SDLP already.
    /// The two public types [`Message`] and [`LinkedMessage`] are wrappers around this one.
    ///
    /// Due to some quirks in the visibility warnings, this is marked `pub` and manually excluded
    /// from the `pub use linked::{}` export above.
    #[derive(Clone, Debug)]
    pub struct MessageInternal<Z = ()> {
        id: usize,
        len: usize,
        pt: Arc<PlaintextTyped>,
        zkp_type: Z,
    }

    /// A [`Plaintext`] message that can be [encrypted again](`LogProofBuilder::encrypt_msg`).
    #[derive(Clone, Debug)]
    pub struct Message(MessageInternal<()>);

    /// A [`Plaintext`] message that can be [encrypted again](`LogProofBuilder::encrypt_msg`) or
    /// [linked to a ZKP](`LogProofBuilder::linked_input`). Create this with
    /// [`LogProofBuilder::encrypt_returning_link`].
    #[derive(Debug)]
    pub struct LinkedMessage(MessageInternal<Type>);

    impl LinkedMessage {
        fn from_message(msg: Message, zkp_type: Type) -> Self {
            LinkedMessage(MessageInternal {
                id: msg.0.id,
                len: msg.0.len,
                pt: msg.0.pt,
                zkp_type,
            })
        }
    }

    mod private {

        pub trait Sealed {}
        impl Sealed for super::Message {}
        impl Sealed for super::LinkedMessage {}
    }

    /// Indicates that the message is already added to the SDLP, and hence can be used as an
    /// argument to [`LogProofBuilder::encrypt_msg`].
    pub trait ExistingMessage: private::Sealed {
        /// Convert the message to the internal type.
        fn as_internal(&self) -> MessageInternal<()>;
    }

    impl ExistingMessage for Message {
        fn as_internal(&self) -> MessageInternal<()> {
            self.0.clone()
        }
    }

    impl ExistingMessage for LinkedMessage {
        fn as_internal(&self) -> MessageInternal<()> {
            let msg = self.0.clone();
            MessageInternal {
                id: msg.id,
                len: msg.len,
                pt: msg.pt,
                zkp_type: (),
            }
        }
    }

    /// This is an internal type used as arguments for the internal encryption methods.
    enum Msg<Z> {
        // Not yet added to SDLP
        Initial(PlaintextTyped),
        // Already added to SDLP
        Existing(MessageInternal<Z>),
    }

    enum Key<'a> {
        Public(&'a PublicKey),
        Private(&'a PrivateKey),
    }

    impl<Z> Msg<Z> {
        fn pt_typed(&self) -> &PlaintextTyped {
            match self {
                Msg::Initial(pt) => pt,
                Msg::Existing(mi) => mi.pt.as_ref(),
            }
        }
        fn pt(&self) -> &Plaintext {
            &self.pt_typed().plaintext
        }
        fn type_name(&self) -> &Type {
            &self.pt_typed().type_name
        }
        fn existing_id(&self) -> Option<usize> {
            match self {
                Msg::Initial(_) => None,
                Msg::Existing(mi) => Some(mi.id),
            }
        }
    }

    impl From<PlaintextTyped> for Msg<()> {
        fn from(pt: PlaintextTyped) -> Self {
            Msg::Initial(pt)
        }
    }

    // Infallible since we've already obtained the plaintext
    impl<Z> TryIntoPlaintext for Msg<Z> {
        fn try_into_plaintext(&self, _params: &Params) -> Result<Plaintext> {
            Ok(self.pt().clone())
        }
    }

    // Forward to the underlying plaintext type
    impl<Z> crate::TypeNameInstance for Msg<Z> {
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

    /// A builder for an [`Sdlp`] (without any linked ZKP program).
    pub type SdlpBuilder<'r, 'k> = LogProofBuilder<'r, 'k, 'static, Fhe, ()>;

    impl<'r, 'k> SdlpBuilder<'r, 'k> {
        /// Create a new [`SdlpBuilder`].
        pub fn new(runtime: &'r FheRuntime) -> Self {
            LogProofBuilder::new_internal(runtime)
        }

        /// Build the [`Sdlp`].
        pub fn build(self) -> Result<Sdlp> {
            self.build_logproof()
        }
    }

    /// A builder for a [`LinkedProof`].
    pub type LinkedProofBuilder<'r, 'k, 'z> =
        LogProofBuilder<'r, 'k, 'z, FheZkp, BulletproofsBackend>;

    impl<'r, 'k, 'z> LinkedProofBuilder<'r, 'k, 'z> {
        /// Create a new [`LinkedProofBuilder`].
        pub fn new(runtime: &'r FheZkpRuntime<BulletproofsBackend>) -> Self {
            LogProofBuilder::new_internal(runtime)
        }

        /// Build just the [`Sdlp`] portion of the linked proof.
        pub fn build_sdlp(&self) -> Result<Sdlp> {
            self.build_logproof()
        }

        /// Build the [`LinkedProof`].
        pub fn build(&mut self) -> Result<LinkedProof> {
            self.build_linkedproof()
        }
    }

    impl<'r, 'k, 'z, M: marker::Fhe, Z> LogProofBuilder<'r, 'k, 'z, M, Z> {
        /// Create a new [`LogProofBuilder`].
        fn new_internal(runtime: &'r GenericRuntime<M, Z>) -> Self {
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

        /// Encrypt a plaintext, adding the encryption statement to the logproof.
        ///
        /// If you do not want to add the encryption statement to the proof, just use [the
        /// runtime](`crate::GenericRuntime::encrypt`) directly.
        pub fn encrypt<P>(&mut self, message: &P, public_key: &'k PublicKey) -> Result<Ciphertext>
        where
            P: TryIntoPlaintext + TypeName,
        {
            let pt = self.plaintext_typed(message)?;
            self.encrypt_asymmetric_internal(Msg::from(pt), public_key, None)
        }

        /// Encrypt a plaintext symmetrically, adding the encryption statement to the logproof.
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
            self.encrypt_symmetric_internal(Msg::from(pt), private_key, None)
        }

        /// Encrypt a plaintext, adding the encryption statement to the logproof and returning the
        /// message to optionally be [encrypted again](`Self::encrypt_msg`), that is, _shared_
        /// with another logproof statement.
        ///
        /// If you do not want to add the encryption statement to the proof, just use [the
        /// runtime](`crate::GenericRuntime::encrypt`) directly.
        pub fn encrypt_returning_msg<P>(
            &mut self,
            message: &P,
            public_key: &'k PublicKey,
        ) -> Result<(Ciphertext, Message)>
        where
            P: TryIntoPlaintext + TypeName,
        {
            self.encrypt_returning_msg_internal(message, Key::Public(public_key), None)
        }

        /// Encrypt a plaintext, adding the encryption statement to the logproof and returning the
        /// message to optionally be [encrypted again](`Self::encrypt_msg`), that is, _shared_
        /// with another logproof statement.
        ///
        /// If you do not want to add the encryption statement to the proof, just use [the
        /// runtime](`crate::GenericRuntime::encrypt_symmetric`) directly.
        pub fn encrypt_symmetric_returning_msg<P>(
            &mut self,
            message: &P,
            private_key: &'k PrivateKey,
        ) -> Result<(Ciphertext, Message)>
        where
            P: TryIntoPlaintext + TypeName,
        {
            self.encrypt_returning_msg_internal(message, Key::Private(private_key), None)
        }

        fn encrypt_returning_msg_internal<P>(
            &mut self,
            message: &P,
            key: Key<'k>,
            bounds: Option<Bounds>,
        ) -> Result<(Ciphertext, Message)>
        where
            P: TryIntoPlaintext + TypeName,
        {
            let plaintext_typed = self.plaintext_typed(message)?;
            let idx_start = self.messages.len();
            let ct = match key {
                Key::Public(public_key) => self.encrypt_asymmetric_internal(
                    Msg::from(plaintext_typed.clone()),
                    public_key,
                    bounds,
                ),
                Key::Private(private_key) => self.encrypt_symmetric_internal(
                    Msg::from(plaintext_typed.clone()),
                    private_key,
                    bounds,
                ),
            }?;
            let idx_end = self.messages.len();
            let msg_internal = MessageInternal {
                id: idx_start,
                pt: Arc::new(plaintext_typed),
                len: idx_end - idx_start,
                zkp_type: (),
            };
            Ok((ct, Message(msg_internal)))
        }

        /// Encrypt an existing message, adding the new encryption statement to the logproof.
        ///
        /// This method purposefully reveals that two ciphertexts encrypt the same underlying value. If
        /// this is not what you want, use [`Self::encrypt`].
        ///
        /// This method assumes that you've created the `message` argument with _this_ builder.
        pub fn encrypt_msg<E: ExistingMessage>(
            &mut self,
            message: &E,
            public_key: &'k PublicKey,
        ) -> Result<Ciphertext> {
            // The existing message already has bounds, no need to recompute them.
            let bounds = None;
            self.encrypt_asymmetric_internal(
                Msg::Existing(message.as_internal().clone()),
                public_key,
                bounds,
            )
        }

        /// Encrypt an existing message symmetrically, adding the new encryption statement to the
        /// logproof.
        ///
        /// This method purposefully reveals that two ciphertexts encrypt the same underlying value. If
        /// this is not what you want, use [`Self::encrypt_symmetric`].
        ///
        /// This method assumes that you've created the `message` argument with _this_ builder.
        pub fn encrypt_symmetric_msg<E: ExistingMessage>(
            &mut self,
            message: &E,
            private_key: &'k PrivateKey,
        ) -> Result<Ciphertext> {
            // The existing message already has bounds, no need to recompute them.
            let bounds = None;
            self.encrypt_symmetric_internal(
                Msg::Existing(message.as_internal().clone()),
                private_key,
                bounds,
            )
        }

        /// Decrypt a ciphertext, adding the decryption statement to the logproof and returning the
        /// message to be shared with another proof statement.
        ///
        /// Use this method if you have an existing ciphertext and want to prove that it is well
        /// formed, and you intend to re-encrypt it, refreshing the noise but not the plaintext
        /// polynomial encoding.
        pub fn decrypt_returning_msg<P>(
            &mut self,
            ciphertext: &Ciphertext,
            private_key: &'k PrivateKey,
        ) -> Result<(P, Message)>
        where
            P: TryIntoPlaintext + TryFromPlaintext + TypeName,
        {
            self.decrypt_internal::<P>(ciphertext, private_key, None)
        }

        fn decrypt_internal<P>(
            &mut self,
            ciphertext: &Ciphertext,
            private_key: &'k PrivateKey,
            bounds: Option<Bounds>,
        ) -> Result<(P, Message)>
        where
            P: TryIntoPlaintext + TryFromPlaintext + TypeName,
        {
            let start_idx = self.messages.len();
            let plaintext =
                self.runtime
                    .decrypt_map_components::<P>(ciphertext, private_key, |m, ct| {
                        let message_id = self.messages.len();
                        self.messages.push(BfvMessage {
                            plaintext: m.clone(),
                            bounds: bounds.clone(),
                        });
                        self.statements.push(BfvProofStatement::Decryption {
                            message_id,
                            ciphertext: ct.clone(),
                        });
                        self.witness.push(BfvWitness::Decryption {
                            private_key: Cow::Borrowed(&private_key.0.data),
                        });
                    })?;
            let end_idx = self.messages.len();

            // Decode to the expected type and return the message
            let p = P::try_from_plaintext(&plaintext, self.runtime.params())?;
            // Make sure we use the decrypted plaintext here, and not a new
            // `P::try_into_plaintext`, which will always result in a _fresh_ plaintext encoding
            // and may be different from the decrypted ciphertext.
            let pt = Arc::new(PlaintextTyped {
                plaintext,
                type_name: P::type_name(),
            });
            let msg_internal = MessageInternal {
                id: start_idx,
                pt,
                len: end_idx - start_idx,
                zkp_type: (),
            };
            Ok((p, Message(msg_internal)))
        }

        fn encrypt_asymmetric_internal<T>(
            &mut self,
            message: Msg<T>,
            public_key: &'k PublicKey,
            bounds: Option<Bounds>,
        ) -> Result<Ciphertext> {
            let existing_idx = message.existing_id();
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

        fn encrypt_symmetric_internal<T>(
            &mut self,
            message: Msg<T>,
            private_key: &'k PrivateKey,
            bounds: Option<Bounds>,
        ) -> Result<Ciphertext> {
            let existing_idx = message.existing_id();
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
        fn build_logproof(&self) -> Result<Sdlp> {
            Sdlp::create(&self.build_sdlp_pk()?)
        }

        fn build_sdlp_pk(&self) -> Result<SealSdlpProverKnowledge> {
            let params = self.runtime.params();
            match &params.coeff_modulus[..] {
                SealQ128_1024::Q => Ok(SealSdlpProverKnowledge::from(
                    self.build_sdlp_pk_generic::<1, SealQ128_1024>()?,
                )),
                SealQ128_2048::Q => Ok(SealSdlpProverKnowledge::from(
                    self.build_sdlp_pk_generic::<1, SealQ128_2048>()?,
                )),
                SealQ128_4096::Q => Ok(SealSdlpProverKnowledge::from(
                    self.build_sdlp_pk_generic::<2, SealQ128_4096>()?,
                )),
                SealQ128_8192::Q => Ok(SealSdlpProverKnowledge::from(
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
            let mut bounds = vec![params.plain_modulus.ceil_log2(); P::DEGREE_BOUND];
            bounds.resize(params.lattice_dimension as usize, 0);
            Bounds(bounds)
        }
    }

    impl<'r, 'k, 'z, M: marker::Fhe + marker::Zkp> LogProofBuilder<'r, 'k, 'z, M, BulletproofsBackend> {
        /// Encrypt a plaintext intended for linking.
        ///
        /// The returned `LinkedMessage` can be used:
        /// 1. to add an encryption statement of ciphertext equality to the logproof (see [`Self::encrypt_msg`]).
        /// 2. as a linked input to a ZKP program (see [`Self::linked_input`]).
        pub fn encrypt_returning_link<P>(
            &mut self,
            message: &P,
            public_key: &'k PublicKey,
        ) -> Result<(Ciphertext, LinkedMessage)>
        where
            P: LinkWithZkp + TryIntoPlaintext + TypeName,
        {
            // The user intends to link this message, so add a more conservative bound
            let bounds = self.mk_bounds::<P>();
            let (ct, msg) = self.encrypt_returning_msg_internal(
                message,
                Key::Public(public_key),
                Some(bounds),
            )?;
            let zkp_type = P::ZkpType::<BulletproofsFieldSpec>::type_name();
            Ok((ct, LinkedMessage::from_message(msg, zkp_type)))
        }

        /// Symmetrically encrypt a plaintext intended for linking.
        ///
        /// The returned `LinkedMessage` can be used:
        /// 1. to add an encryption statement of ciphertext equality to the logproof (see [`Self::encrypt_msg`]).
        /// 2. as a linked input to a ZKP program (see [`Self::linked_input`]).
        pub fn encrypt_symmetric_returning_link<P>(
            &mut self,
            message: &P,
            private_key: &'k PrivateKey,
        ) -> Result<(Ciphertext, LinkedMessage)>
        where
            P: LinkWithZkp + TryIntoPlaintext + TypeName,
        {
            // The user intends to link this message, so add a more conservative bound
            let bounds = self.mk_bounds::<P>();
            let (ct, msg) = self.encrypt_returning_msg_internal(
                message,
                Key::Private(private_key),
                Some(bounds),
            )?;
            let zkp_type = P::ZkpType::<BulletproofsFieldSpec>::type_name();
            Ok((ct, LinkedMessage::from_message(msg, zkp_type)))
        }

        /// Decrypt a ciphertext, adding the decryption statement to the logproof and returning the
        /// linked message to be shared with another logproof statement or linked to a ZKP program.
        pub fn decrypt_returning_link<P>(
            &mut self,
            ciphertext: &Ciphertext,
            private_key: &'k PrivateKey,
        ) -> Result<(P, LinkedMessage)>
        where
            P: LinkWithZkp + TryIntoPlaintext + TryFromPlaintext + TypeName,
        {
            let bounds = self.mk_bounds::<P>();
            let (pt, msg) = self.decrypt_internal::<P>(ciphertext, private_key, Some(bounds))?;
            let zkp_type = P::ZkpType::<BulletproofsFieldSpec>::type_name();
            Ok((pt, LinkedMessage::from_message(msg, zkp_type)))
        }

        /// Add a ZKP program to be linked with the logproof.
        ///
        /// This method is required to call [`LinkedProofBuilder::build`].
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

        /// Add a constant input to the ZKP program.
        pub fn constant_input(&mut self, input: impl Into<ZkpProgramInput>) -> &mut Self {
            self.constant_inputs.push(input.into());
            self
        }

        /// Output a [`LinkedProof`] from the encryption statements and ZKP program and inputs added to
        /// this builder.
        fn build_linkedproof(&self) -> Result<crate::linked::LinkedProof> {
            let sdlp = self.build_sdlp_pk()?;
            let program = self.compiled_zkp_program.ok_or_else(|| {
                BuilderError::user_error("Cannot build linked proof without a compiled ZKP program. Use the `.zkp_program()` method")
            })?;
            let linked_indices = self
                .linked_inputs
                .iter()
                .flat_map(|m| (m.0.id..m.0.id + m.0.len).map(|ix| (ix, 0)))
                .collect::<Vec<_>>();
            let linked_types = self
                .linked_inputs
                .iter()
                .map(|m| m.0.zkp_type.clone())
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
