#[derive(Debug, Clone)]
/**
 * An error that occurred when verifying a proof.
 */
pub enum ProofError {
    /**
     * Failed to verify a proof.
     */
    VerificationError,

    /**
     * The proof is malformed.
     */
    MalformedProof,
}
