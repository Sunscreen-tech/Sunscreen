use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use crate::{PrivateKey, SealData};

use sunscreen_compiler_common::CompilationResult;
use sunscreen_fhe_program::Operation as FheOperation;
use sunscreen_zkp_backend::{Operation as ZkpOperation, BigInt};

// Global data structure storing session information
static SESSIONS: OnceLock<Mutex<HashMap<String, Session>>> = OnceLock::new();

pub fn get_sessions() -> &'static Mutex<HashMap<String, Session>> {
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

/**
 * Determines if the session being debugged is for an FHE or ZKP program.
 */
pub enum Session {
    BfvSession(BfvSession),
    ZkpSession(ZkpSession),
}

impl From<BfvSession> for Session {
    fn from(value: BfvSession) -> Self {
        Self::BfvSession(value)
    }
}

impl Session {
    pub fn unwrap_bfv_session(&self) -> &BfvSession {
        match self {
            Self::BfvSession(s) => s,
            _ => panic!("Called unwrap_bfv_session on a non-BFV session"),
        }
    }

    pub fn unwrap_bfv_session_mut(&mut self) -> &mut BfvSession {
        match self {
            Self::BfvSession(s) => s,
            _ => panic!("Called unwrap_bfv_session_mut on a non-BFV session"),
        }
    }

    pub fn unwrap_zkp_session(&self) -> &ZkpSession {
        match self {
            Self::ZkpSession(s) => s,
            _ => panic!("Called unwrap_zkp_session on a non-ZKP session"),
        }
    }

    pub fn unwrap_zkp_session_mut(&mut self) -> &mut ZkpSession {
        match self {
            Self::ZkpSession(s) => s,
            _ => panic!("Called unwrap_zkp_session_mut on a non-ZKP session"),
        }
    }
}

/**
 * Stores the relevant information for debugging an FHE program.
 */
pub struct BfvSession {
    /**
     * The compilation graph used to execute the program.
     */
    pub graph: CompilationResult<FheOperation>,
    /**
     * The values of operands in the compilation graph.
     */
    pub program_data: Vec<Option<SealData>>,
    /**
     * Used for decryption of ciphertexts for visualization.
     */
    pub private_key: PrivateKey,

    /**
     * The source code of the FHE program.
     */
    pub source_code: String,
}
impl BfvSession {
    /**
     * Constructs a new `FheDebugInfo`.
     */
    pub fn new(
        graph: &CompilationResult<FheOperation>,
        private_key: &PrivateKey,
        source_code: &str,
    ) -> Self {
        Self {
            graph: graph.clone(),
            program_data: vec![None; graph.node_count()],
            private_key: private_key.clone(),
            source_code: source_code.to_owned(),
        }
    }
}

/**
 * Stores the relevant information for debugging a ZKP program.
 */
pub struct ZkpSession {
    /**
     * The compilation graph used to execute the program.
     */
    pub graph: CompilationResult<ZkpOperation>,
    /**
     * The values of operands in the compilation graph.
     */
    // TODO: figure out how to refactor this
    pub program_data: Vec<Option<BigInt>>,

    /**
     * The source code of the ZKP program.
     */
    pub source_code: String,
}

impl ZkpSession {
    /**
     * Constructs a new `ZkpDebugInfo`.
     */
    pub fn new(graph: &CompilationResult<ZkpOperation>, source_code: &str) -> Self {
        Self {
            graph: graph.clone(),
            program_data: vec![None; graph.node_count()],
            source_code: source_code.to_owned(),
        }
    }
}
