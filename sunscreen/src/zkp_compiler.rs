use sunscreen_runtime::CallSignature;
use sunscreen_zkp_compiler::ZkpFrontendCompilation;

use crate::Result;

/**
 * An internal representation of a ZKP program specification.
 */
pub trait ZkpProgramFn {
    /**
     * Create a circuit from this specification.
     */
    fn build(&self) -> Result<ZkpFrontendCompilation>;

    /**
     * Gets the call signature for this program.
     */
    fn signature(&self) -> CallSignature;

    /**
     * Gets the name of this program.
     */
    fn name(&self) -> &str;
}
