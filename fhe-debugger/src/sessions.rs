use std::sync::{Mutex, OnceLock};
use std::collections::HashMap;

use crate::error::*;
use crate::metadata::*;
use crate::DebugInfo;
use crate::ZkpProgramInput;
use crate::{
    run_program_unchecked, serialization::WithContext, Ciphertext, FheProgramInput,
    InnerCiphertext, InnerPlaintext, Plaintext, PrivateKey, PublicKey, SealCiphertext, SealData,
    SealPlaintext, TryFromPlaintext, TryIntoPlaintext, TypeNameInstance,
};

use log::trace;
use seal_fhe::SecretKey;
use sunscreen_fhe_program::FheProgramTrait;
use sunscreen_fhe_program::SchemeType;

use seal_fhe::{
    BFVEvaluator, BfvEncryptionParametersBuilder, Context as SealContext, Decryptor, Encryptor,
    KeyGenerator, Modulus,
};

// Global data structure storing session information
pub static SESSIONS: OnceLock<Mutex<HashMap<String, DebugType>>> = OnceLock::new();

/**
 * Determines if the session being debugged is for an FHE or ZKP program.
 */
pub enum DebugType {
    FheDebugInfo,
    ZkpDebugInfo
}

/**
 * Stores the relevant information for debugging an FHE program.
 */
pub struct FheDebugInfo {
    /**
     * The compilation graph used to execute the program.
     */
    pub graph: CompilationResult,
    /**
     * The values of operands in the compilation graph.
     */
    pub program_data: Vec<Option<SealData>>,
    /**
     * Used for decryption of ciphertexts for visualization.
     */
    pub secret_key: Option<&SecretKey>
}

// TODO: implement this
/**
 * Stores the relevant information for debugging a ZKP program.
 */
pub struct ZkpDebugInfo {

}