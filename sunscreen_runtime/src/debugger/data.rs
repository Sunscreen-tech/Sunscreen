use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct SerializedSealData {
    value: i64,
    data_type: SunscreenTypes,
    noise_budget: f64,
    coefficients: Vec<u64>,
    multiplicative_depth: u64
}

#[derive(Clone, Serialize, Deserialize)]
pub enum SunscreenTypes {    

}