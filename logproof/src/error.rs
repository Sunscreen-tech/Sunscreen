#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
/**
 * An error that occurred when verifying a proof.
 */
pub enum ProofError {
    /**
     * Failed to verify a proof.
     */
    #[error("Failed to verify proof")]
    VerificationError,

    /**
     * The proof is malformed.
     */
    #[error("The proof is malformed")]
    MalformedProof,
}
