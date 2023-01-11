use petgraph::stable_graph::NodeIndex;
use static_assertions::const_assert;
use sunscreen_compiler_common::GraphQueryError;
use thiserror::Error;

#[derive(Clone, Debug, Error, PartialEq, Eq)]
/**
 * An error in a ZKP backend.
 */
pub enum Error {
    #[cfg(feature = "bulletproofs")]
    #[error("Bulletproofs R1CS error: {0:#?}")]
    /**
     * Encountered an error when creating or verifying a Bulletproofs proof.
     */
    BulletproofsR1CSError(Box<bulletproofs::r1cs::R1CSError>),

    #[error("Value {0} is out of range for the chosen backend")]
    /**
     * Encountered a value out of range for the field type in the chosen backend.
     */
    OutOfRange(Box<String>),

    #[error("Argument mismatch: {0}")]
    /**
     * The arguments given to a ZKP program don't match what the program expects.
     */
    InputsMismatch(Box<String>),

    #[error("The given proof isn't valid for the backend proof system.")]
    /**
     * Attempted to verify a proof incompatible with the given backend proof system.
     */
    IncorrectProofType,

    #[error("The backend graph is malformed {0}")]
    /**
     * The program is malformed and caused a query failure.
     */
    GraphQueryError(#[from] GraphQueryError),

    #[error("Gadget error: {0}")]
    /**
     * A gadget encountered an error.
     */
    GadgetError(Box<String>),

    #[error("Malformed ZKP program: {0}")]
    /**
     * The given program is malformed.
     */
    MalformedZkpProgram(Box<String>),

    #[error("A constraint could not be satisfied.")]
    /**
     * A constraint could not be satisfied.
     */
    UnsatifiableConstraint(NodeIndex),
}

impl Error {
    /**
     * Create an [`Error::OutOfRange`].
     */
    pub fn out_of_range(val: &str) -> Self {
        Self::OutOfRange(Box::new(val.to_owned()))
    }

    /**
     * Create an [`Error::GadgetError`].
     */
    pub fn gadget_error(msg: &str) -> Self {
        Self::GadgetError(Box::new(msg.to_owned()))
    }

    /**
     * Create an [`Error::MalformedZkpProgram`].
     */
    pub fn malformed_zkp_program(msg: &str) -> Self {
        Self::MalformedZkpProgram(Box::new(msg.to_owned()))
    }

    /**
     * Create an [`Error::InputsMismatch`].
     */
    pub fn inputs_mismatch(msg: &str) -> Self {
        Self::InputsMismatch(Box::new(msg.to_owned()))
    }
}

impl From<bulletproofs::r1cs::R1CSError> for Error {
    fn from(e: bulletproofs::r1cs::R1CSError) -> Self {
        Self::BulletproofsR1CSError(Box::new(e))
    }
}

const_assert!(std::mem::size_of::<Error>() <= 16);

/**
 * See [`std::result::Result`].
 */
pub type Result<T> = std::result::Result<T, Error>;
