//! This module contains the [`LogProofBuilder`], which allows you to perform encryptions while
//! aggregating SDLP proof statements of the ciphertext validity.

// TODO remove
#![allow(missing_docs)]
#![allow(unused_imports)]

use std::{borrow::Cow, collections::HashMap, sync::Arc};

use logproof::{
    bfv_statement::{self, BfvProofStatement, BfvWitness, StatementParams},
    crypto::CryptoHash,
    math::ModSwitch,
    rings::{
        SealQ128_1024, SealQ128_2048, SealQ128_4096, SealQ128_8192, ZqRistretto, ZqSeal128_1024,
        ZqSeal128_2048, ZqSeal128_4096, ZqSeal128_8192,
    },
    LogProofProverKnowledge, LogProofVerifierKnowledge,
};
use seal::SecurityLevel;
use seal_fhe as seal;
use sunscreen_compiler_common::{Type, TypeName};
use sunscreen_math::ring::{
    ArithmeticBackend, BarrettBackend, BarrettConfig, Ring, RingModulus, Zq,
};

use crate::{
    marker, BFVEncryptionComponents, Ciphertext, Error, GenericRuntime, Params, Plaintext,
    PrivateKey, PublicKey, Result, TryIntoPlaintext,
};

pub trait Share: TryIntoPlaintext + TypeName {
    /// The number of underlying BFV plaintexts.
    ///
    /// It is up to the implementer to ensure that this number always matches the number of
    /// plaintexts underlying the outer [`Plaintext`]. This is not checked by the compiler. If the
    /// type encodes a variable number of plaintexts, then a valid `Share` impl does not exist.
    const MESSAGE_LEN: usize;
}

#[derive(Debug, Clone)]
struct PlaintextTyped {
    plaintext: Plaintext,
    type_name: Type,
}

/// A [`Plaintext`] message that can be shared. Create this with [`LogProofBuilder::share`].
//
// Initial idea was to just rely on `Arc::ptr_eq` to compare `SharedMessage`s... would be elegant
// but does it make sense? I don't know if we are guaranteed the underlying data doesn't move,
// unless you mess with Pin/Unpin, which seems grossly unnecessary for this.
//
// Instead, use an `id: usize` and only dole this out from the builder itself.
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
pub struct LogProofBuilder<'r, 'p, 's, M, B> {
    runtime: &'r GenericRuntime<M, B>,
    statements: Vec<Statement<'p, 's>>,
    shared_messages: Vec<SharedMessage>,
}

impl<'r, 'p, 's, M: marker::Fhe, Z> LogProofBuilder<'r, 'p, 's, M, Z> {
    pub fn new(runtime: &'r GenericRuntime<M, Z>) -> Self {
        Self {
            runtime,
            statements: vec![],
            shared_messages: vec![],
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

    // shit need P::type_name() available here...

    fn encrypt_internal(
        &mut self,
        message: Message,
        public_key: &'p PublicKey,
    ) -> Result<Ciphertext> {
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

    pub fn build(self) -> Result<SealSdlpEnum> {
        let params = self.runtime.params();
        match (params.lattice_dimension, params.security_level) {
            (1024, SecurityLevel::TC128) => Ok(SealSdlpEnum::LP1024(self.build_generic()?)),
            (2048, SecurityLevel::TC128) => Ok(SealSdlpEnum::LP2048(self.build_generic()?)),
            (4096, SecurityLevel::TC128) => Ok(SealSdlpEnum::LP4096(self.build_generic()?)),
            (8192, SecurityLevel::TC128) => Ok(SealSdlpEnum::LP8192(self.build_generic()?)),
            _ => Err(Error::UnsupportedParameters),
        }
    }

    pub fn build_dyn(self) -> Result<Box<dyn SealSdlp>> {
        let params = self.runtime.params();
        match (params.lattice_dimension, params.security_level) {
            (1024, SecurityLevel::TC128) => Ok(Box::new(self.build_generic::<1, SealQ128_1024>()?)),
            (2048, SecurityLevel::TC128) => Ok(Box::new(self.build_generic::<1, SealQ128_2048>()?)),
            (4096, SecurityLevel::TC128) => Ok(Box::new(self.build_generic::<2, SealQ128_4096>()?)),
            (8192, SecurityLevel::TC128) => Ok(Box::new(self.build_generic::<3, SealQ128_8192>()?)),
            _ => Err(Error::UnsupportedParameters),
        }
    }

    // pub fn build_dyn2<const N: usize>(
    //     self,
    // ) -> Result<LogProofProverKnowledge<Zq<N, BarrettBackend<N, impl BarrettConfig<N>>>>> {
    //     let params = self.runtime.params();
    //     match (params.lattice_dimension, params.security_level) {
    //         (1024, SecurityLevel::TC128) => Ok(self.build_generic::<1, SealQ128_1024>()?),
    //         (2048, SecurityLevel::TC128) => Ok(self.build_generic::<1, SealQ128_2048>()?),
    //         (4096, SecurityLevel::TC128) => Ok(self.build_generic::<2, SealQ128_4096>()?),
    //         (8192, SecurityLevel::TC128) => Ok(self.build_generic::<3, SealQ128_8192>()?),
    //         _ => Err(Error::UnsupportedParameters),
    //     }
    // }

    // TODO this is unnecesarily complicated, built off an API that we haven't yet used. Take down
    // the BFVEncyrptionComponents and maybe offer an FnMut arg in the encryption method that lets
    // us gather them ourselves. And then maybe we just build BfvStatements directly, at the time
    // of encryption, instead of these intermediary types. Might mean cloning but w/e.
    //
    // That would probably also get rid of the annoying typename tracking thing too. Just have
    // `SharedMessage` hold an `Arc<dyn TypeName + TryIntoPlaintext>`.
    fn build_generic<const N: usize, B: BarrettConfig<N>>(
        self,
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

// impl<'r, 'p, 's, M: marker::Fhe + marker::Zkp, Z> LogProofBuilder<'r, 'p, 's, M, Z> {
//     fn
// }

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

type SealLp<const N: usize> = LogProofProverKnowledge<Zq<N, Box<dyn BarrettConfig<N>>>>;

trait SealSdlp {}
impl SealSdlp for LogProofProverKnowledge<ZqSeal128_1024> {}
impl SealSdlp for LogProofProverKnowledge<ZqSeal128_2048> {}
impl SealSdlp for LogProofProverKnowledge<ZqSeal128_4096> {}
impl SealSdlp for LogProofProverKnowledge<ZqSeal128_8192> {}

impl<'r, 'p, 's, M: marker::Fhe + marker::Zkp, B> LogProofBuilder<'r, 'p, 's, M, B> {
    pub fn linked_proof() {
        todo!("if the underlying runtime has zkp capabilities, let the user create linked proofs with shared messages")
    }
}

// attempt 2 any better? fuck
struct Sdlp(Box<dyn sealed::Sdlp>);
mod sealed {
    use super::*;

    pub trait Sdlp {}

    impl Sdlp for LogProofProverKnowledge<ZqSeal128_1024> {}
    impl Sdlp for LogProofProverKnowledge<ZqSeal128_2048> {}
    impl Sdlp for LogProofProverKnowledge<ZqSeal128_4096> {}
    impl Sdlp for LogProofProverKnowledge<ZqSeal128_8192> {}
}

// attempt 1
// wtf unsuck this
pub enum SealSdlpEnum {
    LP1024(LogProofProverKnowledge<ZqSeal128_1024>),
    LP2048(LogProofProverKnowledge<ZqSeal128_2048>),
    LP4096(LogProofProverKnowledge<ZqSeal128_4096>),
    LP8192(LogProofProverKnowledge<ZqSeal128_8192>),
}

// impl SealSdlpEnum {
//     pub fn with_logproof<T, F>(&self, f: F) -> T
//     where
//         F: FnOnce(
//             &LogProofProverKnowledge<
//                 impl Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord,
//             >,
//         ) -> T,
//     {
//         match self {
//             SealSdlpEnum::LP1024(x) => f(x),
//             SealSdlpEnum::LP2048(x) => f(x),
//             SealSdlpEnum::LP4096(x) => f(x),
//             SealSdlpEnum::LP8192(x) => f(x),
//         }
//     }
// }
