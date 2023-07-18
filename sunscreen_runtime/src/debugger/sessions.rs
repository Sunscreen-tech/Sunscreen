use actix_web::{get, web, App, Handler, HttpResponse, HttpServer, Responder};
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::{to_string, to_string_pretty};
use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard, OnceLock};

use crate::{DebugInfo, FheRuntime, PrivateKey, SealData};

use sunscreen_compiler_common::CompilationResult;
use sunscreen_fhe_program::Operation;

use seal_fhe::SecretKey;
use sunscreen_zkp_backend::CompiledZkpProgram;

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
            _ => panic!("Expected BfvSession"),
        }
    }

    pub fn unwrap_bfv_session_mut(&mut self) -> &mut BfvSession {
        match self {
            Self::BfvSession(s) => s,
            _ => panic!("Expected BfvSession"),
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
    pub graph: CompilationResult<Operation>,
    /**
     * The values of operands in the compilation graph.
     */
    // TODO: maybe this shouldn't be a Vec of SealData ...
    pub program_data: Vec<Option<SealData>>,
    /**
     * Used for decryption of ciphertexts for visualization.
     */
    pub secret_key: SecretKey,

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
        graph: &CompilationResult<Operation>,
        secret_key: &SecretKey,
        source_code: &str,
    ) -> Self {
        Self {
            graph: graph.clone(),
            // don't need a hashmap; if you don't encounter in the right order, it's all initialize das None so you
            // can go back later and fill it in
            program_data: vec![None; graph.node_count()],
            secret_key: secret_key.clone(),
            source_code: source_code.to_owned(),
        }
    }
}
