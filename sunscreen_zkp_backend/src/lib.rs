#[cfg(feature = "bulletproofs")]
pub mod bulletproofs;

mod error;
mod exec;
mod jit;

pub use crypto_bigint::UInt;
use crypto_bigint::U512;
pub use error::*;
pub use exec::ExecutableZkpProgram;
pub use jit::{jit, CompiledZkpProgram, Operation};
use serde::{Deserialize, Serialize};

// Converting between U512 and backend numeric types requires an
// assumption about endianess. We require little endian for now unless
// there's demand for carefully writing endian-aware code.
#[cfg(not(target_endian = "little"))]
compile_error!("This crate currently requires a little endian target architecture.");

pub trait Node {}

#[derive(Clone, Serialize, Deserialize)]
/**
 * An R1CS proof.
 */
pub enum Proof {
    #[cfg(feature = "bulletproofs")]
    /**
     * A Bulletproofs R1CS proof.
     */
    Bulletproofs(Box<bulletproofs::BulletproofsR1CSProof>),

    /**
     * A custom proof type provided by an external crate.
     */
    Custom { name: String, data: Vec<u8> },
}

pub trait FieldValue {}

pub type BigInt = U512;

pub trait ZkpProverBackend {
    fn prove(graph: &ExecutableZkpProgram, inputs: &[BigInt]) -> Result<Proof>;
}

pub trait ZkpVerifierBackend {
    fn verify(graph: &ExecutableZkpProgram, proof: &Proof) -> Result<()>;
}
