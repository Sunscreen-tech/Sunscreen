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

    use std::{borrow::Cow, collections::HashMap, sync::Arc};

    use logproof::{
        bfv_statement::{self, BfvProofStatement, BfvWitness, StatementParams},
        rings::{SealQ128_1024, SealQ128_2048, SealQ128_4096, SealQ128_8192},
        LogProofProverKnowledge,
    };
    use seal_fhe::SecurityLevel;
    use sunscreen_compiler_common::{Type, TypeName};
    use sunscreen_math::ring::{BarrettBackend, BarrettConfig, Zq};
    use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, CompiledZkpProgram};

    use crate::{
        marker, BFVEncryptionComponents, Ciphertext, Error, GenericRuntime, LinkedProof, Params,
        Plaintext, PrivateKey, PublicKey, Result, SealSdlpProverKnowledge, TryIntoPlaintext,
        ZkpProgramInput,
    };

    // TODO use this to limit what types people can share with ZKPs. Implement this after tests are
    // passing. May want to separate the notion of ZKP and internal SDLP sharing.
    /// TODO document
    pub trait Share: TryIntoPlaintext + TypeName {
        /// The number of underlying BFV plaintexts.
        ///
        /// It is up to the implementer to ensure that this number always matches the number of
        /// plaintexts underlying the outer [`Plaintext`]. This is not checked by the compiler. If the
        /// type encodes a variable number of plaintexts, then a valid `Share` impl does not exist.
        const MESSAGE_LEN: usize;
    }

    #[derive(Debug, Clone)]
    pub(crate) struct PlaintextTyped {
        plaintext: Plaintext,
        type_name: Type,
    }

    /// A [`Plaintext`] message that can be shared. Create this with [`LogProofBuilder::share`].
    #[derive(Debug, Clone)]
    pub struct SharedMessage {
        // I think I can track the actual lp_message index here... probably better?
        pub(crate) id: usize,
        // TODO with proper invariants enforced, this field could be removed. It exists in the
        // builder's shared_messages. See if this makes it easier for ZKPs, if not rip it out.
        // Wait or does it even need to exit in builder.shared_messages?
        pub(crate) message: Arc<PlaintextTyped>,
    }

    impl AsRef<Plaintext> for SharedMessage {
        fn as_ref(&self) -> &Plaintext {
            &self.message.plaintext
        }
    }

    enum Message {
        Plain(PlaintextTyped),
        Shared(SharedMessage),
    }

    impl Message {
        fn plaintext(&self) -> &Plaintext {
            match self {
                Message::Plain(m) => &m.plaintext,
                Message::Shared(m) => m.as_ref(),
            }
        }
        fn type_name(&self) -> &Type {
            match self {
                Message::Plain(m) => &m.type_name,
                Message::Shared(m) => &m.message.type_name,
            }
        }
        fn shared_id(&self) -> Option<usize> {
            match self {
                Message::Shared(SharedMessage { id, .. }) => Some(*id),
                _ => None,
            }
        }
    }

    // TODO or just one key 'k lifetime?
    enum EncryptedComponents<'p, 's> {
        Asymmetric {
            public_key: &'p PublicKey,
            components: BFVEncryptionComponents,
        },
        Symmetric {
            private_key: &'s PrivateKey,
            components: (),
        },
    }

    /// Internal state for the [`LogProofBuilder`]. This holds higher level proof statements, messages,
    /// and witnesses, that are later converted into [`logproof::bfv_statement`] piecess.
    //
    // TODO rip this out and just build logproof statements as we go.
    struct Statement<'p, 's> {
        msg: Message,
        encryption: EncryptedComponents<'p, 's>,
    }

    // Could use a marker to determine when a valid proof can be created; if a user calls a method like
    // `add_statement` without message/witness, could return e.g. Builder<Verification>.

    /// A builder for [`LogProofProverKnowledge`] or [`LogProofVerifierKnowledge`].
    ///
    /// Use this builder to encrypt your [`Plaintext`]s while automatically generate a log proof of the
    /// encryption statements. We implicitly assume that these plaintexts and ciphertexts are backed by
    /// the SEAL BFV scheme, otherwise the methods will return an `Err`.
    //
    // TODO when refactoring to build statements as we go, have the shared message id equal the
    // starting message index.
    pub struct LogProofBuilder<'r, 'p, 's, 'z, M, B> {
        // log proof fields
        runtime: &'r GenericRuntime<M, B>,
        statements: Vec<Statement<'p, 's>>,
        shared_messages: Vec<SharedMessage>,

        // linked proof fields
        compiled_zkp_program: Option<&'z CompiledZkpProgram>,
        shared_inputs: Vec<SharedMessage>,
        private_inputs: Vec<ZkpProgramInput>,
        public_inputs: Vec<ZkpProgramInput>,
        constant_inputs: Vec<ZkpProgramInput>,
    }

    impl<'r, 'p, 's, 'z, M: marker::Fhe, Z> LogProofBuilder<'r, 'p, 's, 'z, M, Z> {
        /// Create a new [`LogProofBuilder`].
        pub fn new(runtime: &'r GenericRuntime<M, Z>) -> Self {
            Self {
                runtime,
                statements: vec![],
                shared_messages: vec![],
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
        pub fn encrypt<P>(&mut self, message: &P, public_key: &'p PublicKey) -> Result<Ciphertext>
        where
            P: TryIntoPlaintext + TypeName,
        {
            let pt = self.plaintext_typed(message)?;
            self.encrypt_internal(Message::Plain(pt), public_key)
        }

        /// Encrypt a plaintext intended for sharing.
        ///
        /// The returned `SharedMessage` can be used:
        /// 1. to add an encryption statement of ciphertext equality to the proof (see [`Self::encrypt_shared`]).
        /// 2. as a shared input to a ZKP program (see [`TODO`]).
        pub fn encrypt_and_share<P>(
            &mut self,
            message: &P,
            public_key: &'p PublicKey,
        ) -> Result<(Ciphertext, SharedMessage)>
        where
            P: TryIntoPlaintext + TypeName,
        {
            let pt = self.plaintext_typed(message)?;
            let id = self.shared_messages.len();
            let shared_message = SharedMessage {
                id,
                message: Arc::new(pt),
            };
            self.shared_messages.push(shared_message.clone());
            let ct = self.encrypt_internal(Message::Shared(shared_message.clone()), public_key)?;
            // SHIT this isn't right. Doing it like this, when it is time to process the shared
            // messages, there's nothing linking back to the OG message index....
            Ok((ct, shared_message))
        }

        /// Encrypt a shared message, adding the new encryption statement to the proof.
        ///
        /// This method purposefully reveals that two ciphertexts enrypt the same underlying value. If
        /// this is not what you want, use [`Self::encrypt`].
        ///
        /// This method assumes that you've created the `message` argument with _this_ builder.
        // TODO should I enforce that? I could use a global `static BUILDER_ID: AtomicUsize`...
        pub fn encrypt_shared(
            &mut self,
            message: &SharedMessage,
            public_key: &'p PublicKey,
        ) -> Result<Ciphertext> {
            self.encrypt_internal(Message::Shared(message.clone()), public_key)
        }

        fn encrypt_internal(
            &mut self,
            message: Message,
            public_key: &'p PublicKey,
        ) -> Result<Ciphertext> {
            // TODO during refactor, see if it makes sense to pass in an FnMut(component_i)
            let components = self.runtime.encrypt_return_components_switched_internal(
                message.plaintext(),
                message.type_name(),
                public_key,
                true,
                None,
            )?;
            let ct = components.ciphertext.clone();
            self.statements.push(Statement {
                msg: message,
                encryption: EncryptedComponents::Asymmetric {
                    public_key,
                    components,
                },
            });
            Ok(ct)
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

        // TODO this is unnecesarily complicated, built off an API that we haven't yet used. Take down
        // the BFVEncyrptionComponents and maybe offer an FnMut arg in the encryption method that lets
        // us gather them ourselves. And then maybe we just build BfvStatements directly, at the time
        // of encryption, instead of these intermediary types. Might mean cloning but w/e.
        //
        // That would probably also get rid of the annoying typename tracking thing too. Just have
        // `SharedMessage` hold an `Arc<dyn TypeName + TryIntoPlaintext>`.
        fn build_generic_logproof<const N: usize, B: BarrettConfig<N>>(
            &self,
        ) -> Result<LogProofProverKnowledge<Zq<N, BarrettBackend<N, B>>>>
where {
            let mut lp_statements = vec![];
            let mut lp_messages = vec![];
            let mut lp_witness: Vec<BfvWitness> = vec![];
            let mut idx_map: HashMap<usize, usize> = HashMap::new();

            for statement in &self.statements {
                // handle message id insertion / lookup
                let message_idx_start = statement
                    .msg
                    .shared_id()
                    .and_then(|id| idx_map.get(&id))
                    .copied()
                    .map(Ok::<_, Error>)
                    .unwrap_or_else(|| {
                        let seal_pts = statement
                            .msg
                            .plaintext()
                            .inner_as_seal_plaintext()?
                            .iter()
                            .map(|pt| pt.data.clone()); // TODO accept refs instead of cloning here
                        let idx = lp_messages.len();
                        lp_messages.extend(seal_pts);
                        if let Some(msg_id) = statement.msg.shared_id() {
                            idx_map.insert(msg_id, idx);
                        }
                        Ok(idx)
                    })?;

                // handle statement/witness
                match &statement.encryption {
                    EncryptedComponents::Asymmetric {
                        public_key,
                        components,
                    } => {
                        let seal_cts = &components.ciphertext.inner_as_seal_ciphertext()?;
                        assert_eq!(seal_cts.len(), components.u.len());
                        assert_eq!(seal_cts.len(), components.e.len());
                        assert_eq!(seal_cts.len(), components.r.len());

                        for (i, ct) in seal_cts.iter().enumerate() {
                            let u = &components.u[i];
                            let e = &components.e[i];
                            let r = &components.r[i].inner_as_seal_plaintext()?[0].data;
                            let message_id = message_idx_start + i;

                            lp_statements.push(BfvProofStatement::PublicKeyEncryption {
                                ciphertext: &ct.data,
                                message_id,
                                public_key: &public_key.public_key.data,
                            });
                            lp_witness.push(BfvWitness::PublicKeyEncryption {
                                u: Cow::Borrowed(u),
                                e: std::borrow::Cow::Borrowed(e),
                                r: std::borrow::Cow::Borrowed(r),
                            });
                        }
                    }
                    EncryptedComponents::Symmetric { .. } => todo!("symmetric encryption"),
                }
            }
            let params = self.runtime.params();
            let ctx = self.runtime.context();
            Ok(bfv_statement::generate_prover_knowledge(
                &lp_statements,
                &lp_messages,
                &lp_witness,
                params,
                ctx,
            ))
        }
    }

    // TODO fold sdlp feature into linkedproofs, move enum def to linked.rs, and move all builders into
    // this file as builder module. Add linkedproof_builder method to runtime.

    impl<'r, 'p, 's, 'z, M: marker::Fhe + marker::Zkp>
        LogProofBuilder<'r, 'p, 's, 'z, M, BulletproofsBackend>
    {
        /// Add a ZKP program to be linked with the logproof.
        ///
        /// This method is required to call [`Self::build_linkedproof`].
        // TODO make a marker struct for `LogProofBuilder` and a `LinkedProofBuilder<marker = Zkp>`
        // that can be constructed with `new(CompiledZkpProgram)`.
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
            // TODO this isn't accurate, but will be once we track idx map above.
            let shared_indices = self
                .shared_inputs
                .iter()
                .map(|m| (m.id, 0))
                .collect::<Vec<_>>();
            let program = self.compiled_zkp_program.ok_or_else(|| {
                BuilderError::user_error("Cannot build linked proof without a compiled ZKP program. Use the `.zkp_program()` method")
            })?;

            // debugging
            println!("shared_indices: {:?}", shared_indices);
            match &sdlp.0 {
                crate::SealSdlpProverKnowledgeInternal::LP1(k) => {
                    println!("sdlp.pk.s[shared_indices[0]]: {:?}", k.s[shared_indices[0]])
                }
                crate::SealSdlpProverKnowledgeInternal::LP2(k) => {
                    println!("sdlp.pk.s[shared_indices[0]]: {:?}", k.s[shared_indices[0]])
                }
                crate::SealSdlpProverKnowledgeInternal::LP3(k) => {
                    println!("sdlp.pk.s[shared_indices[0]]: {:?}", k.s[shared_indices[0]])
                }
                crate::SealSdlpProverKnowledgeInternal::LP4(k) => {
                    println!("sdlp.pk.s[shared_indices[0]]: {:?}", k.s[shared_indices[0]])
                }
            }

            LinkedProof::create(
                &sdlp,
                &shared_indices,
                program,
                self.private_inputs.clone(), // bleh
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
