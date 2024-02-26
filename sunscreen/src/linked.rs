//! A linked proof consists of a short discrete log proof (SDLP) and an R1CS bulletproof (BP). It
//! allows you to simultaneously prove an encryption is valid (SDLP) and that the encrypted message
//! has some property (BP).
//!
//! The SDLP proves a linear relation while keeping part of that relation secret. Specifically, the
//! SDLP allows one to prove a matrix relation of the form \\(A \cdot S = T\\), where \\(S\\) is a
//! matrix of secrets (sometimes also called a witness) and \\(T\\) is the result of computing
//! \\(A\\) on that secret.  An example relation is the equation for encryption in BFV, which can
//! be used to show that a ciphertext is a valid encryption of some known underlying message.
//!
//! The BP enables proving arbitrary arithmetic circuits, which can be used to prove that a secret
//! satisfies some property. For example, one can prove that a private transaction can occur
//! because the sender has enough funds to cover the transaction, without revealing what the
//! transaction is.
//!
//! Combining these two proofs is powerful because it allows one to prove both that a ciphertext is
//! a valid encryption of some message and that the message satisfies some property. In the prior
//! example of a private transaction, with a linked proof we can now prove that the sender knows
//! the value in an encrypted transaction and that the sender has enough funds to cover the
//! transaction, without decrypting the transaction.
//!
//! How does this work in practice? If you use our [builder](`LinkedProofBuilder`), you
//! can encrypt messages in a very similar way to our typical [runtime
//! encryption](crate::FheRuntime::encrypt), while also opting to _share_ a message with a linked
//! ZKP program. Under the hood, we'll handle the complicated bits of generating a linear relation
//! for SDLP and sharing the secrets with the [`zkp_program`](crate::zkp_program).
pub use logproof::Bounds;
pub use sunscreen_runtime::{
    ExistingMessage, LinkWithZkp, LinkedMessage, LinkedProof, LinkedProofBuilder, Message, Sdlp,
    SdlpBuilder, SealSdlpProverKnowledge, SealSdlpVerifierKnowledge,
};
