use petgraph::stable_graph::NodeIndex;
use petgraph::stable_graph::StableGraph;
use petgraph::Direction::Incoming;
use seal_fhe::Modulus;
use seal_fhe::BfvEncryptionParametersBuilder;
use seal_fhe::Context;
use seal_fhe::Decryptor;
use seal_fhe::SecretKey;
use serde::{Deserialize, Serialize};
use sunscreen_compiler_common::Operation;
use sunscreen_compiler_common::Type;
use sunscreen_compiler_common::{EdgeInfo, NodeInfo};

use crate::InnerCiphertext;
use crate::PrivateKey;

pub enum DebugNodeType {
    Bfv(BfvNodeType),
    Zkp(ZkpNodeType),
}

#[derive(Clone, Serialize, Deserialize)]
pub struct BfvNodeType {
    pub value: i64,
    pub data_type: Type,
    pub noise_budget: Option<u32>,
    pub coefficients: Vec<Vec<u64>>,
    pub multiplicative_depth: u64,
    pub overflowed: Option<bool>,
    pub noise_exceeded: Option<bool>
}

/**
 * Gets the multiplicative depth of a node in the compilation graph.
 */
pub fn get_mult_depth<O>(
    graph: &StableGraph<NodeInfo<O>, EdgeInfo>,
    node: NodeIndex,
    mut depth: u64,
) -> u64
where
    O: Operation,
{
    if graph
        .node_weight(node)
        .unwrap()
        .operation
        .is_multiplication()
    {
        depth += 1;
    }

    let neighbors = graph.neighbors_directed(node, Incoming);
    if neighbors.clone().count() == 0 {
        return depth;
    }
    let mut max_depth = 0;
    for neighbor in neighbors.clone() {
        let neighbor_depth = get_mult_depth(graph, neighbor, depth);
        max_depth = max_depth.max(neighbor_depth);
    }

    max_depth
}

/**
 * Checks if any coefficients in a polynomial have overflowed.
 */
pub fn overflow_occurred<O>(
    graph: &StableGraph<NodeInfo<O>, EdgeInfo>,
    node: NodeIndex,) -> bool 
where 
    O: Operation
{
    let add_overflow = false;
    let mul_overflow = false;

    add_overflow | mul_overflow
}

/**
 * Given a SEAL InnerCiphertext, return its coefficients.
 */
pub fn decrypt_seal(inner_cipher: InnerCiphertext, sk: &SecretKey) -> Vec<Vec<u64>> {
    let mut coefficients: Vec<Vec<u64>> = Vec::new();
    match inner_cipher {
        InnerCiphertext::Seal { value: vec } => {
            for inner_cipher in vec {
                let mut inner_coefficients = Vec::new();

                let coeff_mod = inner_cipher
                    .params
                    .coeff_modulus
                    .iter()
                    .map(|&num| Modulus::new(num).unwrap())
                    .collect::<Vec<_>>();
                // Decrypt inner ciphertext
                let encryption_params_builder =
                    BfvEncryptionParametersBuilder::new()
                        .set_coefficient_modulus(coeff_mod)
                        .set_plain_modulus_u64(inner_cipher.params.plain_modulus)
                        .set_poly_modulus_degree(
                            inner_cipher.params.lattice_dimension,
                        );
                let encryption_params = encryption_params_builder.build().unwrap();
                let ctx = Context::new(
                    &encryption_params,
                    false,
                    inner_cipher.params.security_level,
                )
                .expect("Failed to create context");

                let decryptor =
                    Decryptor::new(&ctx, sk).expect("Failed to create decryptor");
                let pt = decryptor.decrypt(&inner_cipher.data).unwrap();

                for i in 0..pt.len() {
                    inner_coefficients.push(pt.get_coefficient(i));
                }
                coefficients.push(inner_coefficients);
            }
        }
    }
    coefficients 
}
#[derive(Clone, Serialize, Deserialize)]
pub struct ZkpNodeType {
    pub value: i64,
}

#[test]
fn test_get_mul_depth() {}
