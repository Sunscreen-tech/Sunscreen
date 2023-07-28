use crate::Ciphertext;
use crate::InnerCiphertext;
use crate::PrivateKey;
use crate::SealData;
use crate::WithContext;
use petgraph::stable_graph::NodeIndex;
use petgraph::stable_graph::StableGraph;
use petgraph::Direction::Incoming;
use seal_fhe::BfvEncryptionParametersBuilder;
use seal_fhe::Context;
use seal_fhe::Decryptor;
use seal_fhe::Modulus;
use seal_fhe::SecretKey;
use semver::Version;
use serde::{Deserialize, Serialize};
use sunscreen_compiler_common::Operation;
use sunscreen_compiler_common::Type;
use sunscreen_compiler_common::{EdgeInfo, NodeInfo};

#[derive(Clone, Serialize, Deserialize)]
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
    pub noise_exceeded: Option<bool>,
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
    node: NodeIndex,
    p: u64,
    pk: &PrivateKey,
    program_data: &[Option<SealData>],
) -> bool
where
    O: Operation,
{
    // Overflow only happens after an arithmetic operation involving ciphertexts
    // If the current node has more than 1 parent, then it's an arithmetic operation, so it can't overflow
    // If the current node has no parents, then it's an input node, so it can't overflow
    let mut incoming_neighbors = graph.neighbors_directed(node, Incoming);
    if incoming_neighbors.clone().count() != 1 {
        return false;
    }

    let mut add_overflow = false;
    let mut mul_overflow = false;

    // Create operands
    let mut operands: Vec<Vec<Vec<u64>>> = Vec::new();
    let parent = incoming_neighbors.next().unwrap();
    let operand_nodes = graph.neighbors_directed(parent, Incoming);
    for operand_node in operand_nodes {
        let operand_data = program_data
            .get(operand_node.index())
            .unwrap_or_else(|| {
                panic!(
                    "Couldn't find Option<SealData> in index {:?} of program_data",
                    operand_node.index()
                )
            })
            .clone()
            .unwrap_or_else(|| {
                panic!(
                    "Option<SealData> in index {:?} was None",
                    operand_node.index()
                )
            });
        let ciphertext = match operand_data {
            SealData::Ciphertext(ct) => {
                let with_context = WithContext {
                    params: pk.0.params.clone(),
                    data: ct.clone(),
                };

                let sunscreen_ciphertext = Ciphertext {
                    data_type: Type {
                        is_encrypted: true,
                        name: "ciphertext".to_owned(),
                        version: Version::new(1, 1, 1),
                    },
                    inner: InnerCiphertext::Seal {
                        value: vec![with_context],
                    },
                };
                sunscreen_ciphertext.inner
            }
            // Overflow only happens as the result of operations involving ciphertexts
            _ => continue,
        };
        operands.push(decrypt_seal(ciphertext, &pk.0.data));
    }

    if operands.len() >= 2 {
        for (c0, c1) in operands[0].iter().zip(operands[1].iter()) {
            // Addition overflow
            for i in 0..c0.len() {
                let sum = c0[i] + c1[i];
                if (c0[i] > p / 2 && c1[i] > p / 2 && sum <= p / 2)
                    || (c0[i] <= p / 2 && c1[i] <= p / 2 && sum > p / 2)
                {
                    add_overflow = true;
                    break;
                }
            }

            // Multiplication overflow
            let z_prod = polynomial_mult(c0, c1);
            let zp_prod = polynomial_mult_mod(c0, c1, p);
            if z_prod != zp_prod {
                mul_overflow = true;
            }

            if add_overflow || mul_overflow {
                break;
            }
        }
    }
    add_overflow || mul_overflow
}

fn polynomial_mult(a: &[u64], b: &[u64]) -> Vec<u64> {
    let mut product = vec![0; a.len() + b.len() - 1];
    for (i, &ai) in a.iter().enumerate() {
        for (j, &bj) in b.iter().enumerate() {
            product[i + j] += ai * bj;
        }
    }
    product
}

fn polynomial_mult_mod(a: &[u64], b: &[u64], p: u64) -> Vec<u64> {
    let mut product = vec![0; a.len() + b.len() - 1];
    for (i, &ai) in a.iter().enumerate() {
        for (j, &bj) in b.iter().enumerate() {
            product[i + j] += (ai * bj) % p;
            product[i + j] %= p;
        }
    }
    product
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
                let encryption_params_builder = BfvEncryptionParametersBuilder::new()
                    .set_coefficient_modulus(coeff_mod)
                    .set_plain_modulus_u64(inner_cipher.params.plain_modulus)
                    .set_poly_modulus_degree(inner_cipher.params.lattice_dimension);
                let encryption_params = encryption_params_builder.build().unwrap();
                let ctx = Context::new(
                    &encryption_params,
                    false,
                    inner_cipher.params.security_level,
                )
                .expect("Failed to create context");

                let decryptor = Decryptor::new(&ctx, sk).expect("Failed to create decryptor");
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
    // Send `BigInt` values as strings
    pub value: String,
}

#[test]
fn test_get_mul_depth() {}
