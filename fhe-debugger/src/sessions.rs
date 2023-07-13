use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use sunscreen_runtime::SealData;

use sunscreen_compiler_common::{CompilationResult, Operation};

use seal_fhe::SecretKey;

// Global data structure storing session information
pub static SESSIONS: OnceLock<Mutex<HashMap<String, DebugType>>> = OnceLock::new();

/**
 * Determines if the session being debugged is for an FHE or ZKP program.
 */
pub enum DebugType {
    FheDebugInfo,
    ZkpDebugInfo,
}

/**
 * Stores the relevant information for debugging an FHE program.
 */
pub struct FheDebugInfo<'a, O>
where
    O: Operation,
{
    /**
     * The compilation graph used to execute the program.
     */
    pub graph: CompilationResult<O>,
    /**
     * The values of operands in the compilation graph.
     */
    pub program_data: Vec<Option<SealData>>,
    /**
     * Used for decryption of ciphertexts for visualization.
     */
    pub secret_key: Option<&'a SecretKey>,
}
impl<'a, O> FheDebugInfo<'a, O>
where
    O: Operation,
{
    /**
     * Constructs a new `FheDebugInfo`.
     */
    pub fn new(graph: CompilationResult<O>, secret_key: Option<&'a SecretKey>) -> Self {
        FheDebugInfo {
            graph,
            program_data: Vec::new(),
            secret_key,
        }
    }
}

// TODO: implement this
/**
 * Stores the relevant information for debugging a ZKP program.
 */
pub struct ZkpDebugInfo {}
