use serde::{Serialize, Deserialize};
use sunscreen_compiler_common::Type;

#[derive(Clone, Serialize, Deserialize)]
pub struct SerializedSealData {
    pub value: i64,
    pub data_type: Type,
    pub noise_budget: u32,
    pub coefficients: Vec<u64>,
    pub multiplicative_depth: u64
}