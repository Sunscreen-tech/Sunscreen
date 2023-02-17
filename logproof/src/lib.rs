#![cfg_attr(feature = "nightly-features", feature(test))]
#![deny(missing_docs)]

//! This crate contains proofs for demonstrating facts about lattice
//! relations in zero knowledge. It contains 2 proofs:
//! * [InnerProductProof], which is basically the Bulletproofs inner product
//! proof modified to be zero-knowledge.
//! * [LogProof], which demonstrates knowledge of a solution to a lattice
//! relation `As=t`, where `A`, `s`, `t` are in `Z_q[X] / f(X)`.
//!
//! # Remarks
//! These proofs come from "Short Discreet Log Proofs for FHE and Ring-LWE
//! Ciphertexts" by Pino, Lyubashevsky, and Seiler.
//!

mod assertions;
mod crypto;
mod error;
pub use error::ProofError;

mod generators;
pub use generators::*;

/**
 * Contains a zero-knowledge inner-product proof
 */
mod inner_product;
pub use inner_product::{
    InnerProductProof, ProverKnowledge as InnerProductProverKnowledge,
    VerifierKnowledge as InnerProductVerifierKnowledge,
};

mod linear_algebra;
/**
 * Contains a zero-knowlege proof of a linear relation `As=t` where `A` and `t` are
 * public and `s` is known only to the prover.
 *
 * # Remarks
 * This proof is an implementation of "Short Discrete Log Proofs for FHE"
 * by Pino, Lyubashevsky, and Seiler.
 */
mod linear_relation;
pub use linear_relation::{
    LogProof, ProverKnowledge as LogProofProverKnowledge,
    VerifierKnowledge as LogProofVerifierKnowledge,
};

/**
 * A collection of fields Z_q you can use in our log proofs.
 */
mod fields;
mod math;
mod transcript;
