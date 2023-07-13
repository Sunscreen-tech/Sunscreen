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

pub static SESSIONS: OnceLock<Mutex<HashMap<String, DebugType>>> = OnceLock::new();

pub enum DebugType {
    FheDebugInfo,
    ZkpDebugInfo
}

pub struct FheDebugInfo {
    pub graph: CompilationResult,
    pub program_data: Vec<Option<SealData>>,
    pub secret_key: Option<SecretKey>
}

// TODO: implement this
pub struct ZkpDebugInfo {

}

fn main() {
    let mut lock = HORSE.get_or_init(|| {
        Mutex::new(HashMap::new())
    }).lock().unwrap();
     
    lock.insert(5, 3);
    
    dbg!(lock);
}