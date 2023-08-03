use crate::Ciphertext;
use crate::InnerCiphertext;
use crate::InnerPlaintext;
use crate::PrivateKey;
use crate::SealCiphertext;
use crate::SealData;
use crate::SealPlaintext;
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
use std::collections::{HashMap, VecDeque};
use sunscreen_compiler_common::GraphQuery;
use sunscreen_compiler_common::Operation as OperationTrait;
use sunscreen_compiler_common::Type;
use sunscreen_compiler_common::{EdgeInfo, NodeInfo};
use sunscreen_fhe_program::Operation as FheOperation;
use sunscreen_zkp_backend::BigInt;

#[derive(Clone, Serialize)]
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
pub fn get_mult_depth<O>(graph: &StableGraph<NodeInfo<O>, EdgeInfo>, start_node: NodeIndex) -> u64
where
    O: OperationTrait,
{
    let mut queue: VecDeque<(NodeIndex, u64)> = VecDeque::new();
    let mut visited: HashMap<NodeIndex, bool> = HashMap::new();

    let mut max_depth = 0;

    queue.push_back((start_node, 0));

    while let Some((node, depth)) = queue.pop_front() {
        visited.insert(node, true);

        let curr_depth = depth
            + graph
                .node_weight(node)
                .unwrap()
                .operation
                .is_multiplication() as u64;

        max_depth = max_depth.max(curr_depth);

        let neighbors = graph.neighbors_directed(node, Incoming);
        for neighbor in neighbors {
            if !visited.contains_key(&neighbor) {
                queue.push_back((neighbor, curr_depth));
            }
        }
    }

    max_depth
}

/**
 * Checks if any coefficients in a polynomial have overflowed.
 */
pub fn overflow_occurred(
    graph: &StableGraph<NodeInfo<FheOperation>, EdgeInfo>,
    node: NodeIndex,
    p: u64,
    pk: &PrivateKey,
    program_data: &[Option<SealData>],
) -> bool {
    // Overflow only occurs at the output of an operation node
    let mut parents = graph.neighbors_directed(node, Incoming);
    if parents.clone().count() == 1 {
        return false;
    }

    let query = GraphQuery::new(graph);

    // Extract operand data
    let parent = parents.next().unwrap();

    if !graph.node_weight(parent).unwrap().operation.is_binary() {
        return false;
    }

    let (left_op, right_op) = query.get_binary_operands(parent).unwrap();

    let operand_nodes = [left_op, right_op];
    let mut op_coefficients: [Vec<Vec<u64>>; 2] = [Vec::new(), Vec::new()];

    for (idx, &operand_node) in operand_nodes.iter().enumerate() {
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
        match operand_data {
            SealData::Ciphertext(ct) => {
                let ciphertext = create_ciphertext_from_seal_data(ct, pk);
                op_coefficients[idx] = decrypt_inner_cipher(ciphertext, &pk.0.data);
            }
            SealData::Plaintext(pt) => {
                let plaintext = create_plaintext_from_seal_data(pt, pk);
                op_coefficients[idx] = decrypt_inner_plain(plaintext);
            }
        };
    }

    // Overflow only occurs on arithmetic operations involving at least 1 ciphertext
    match graph.node_weight(node).unwrap().operation {
        FheOperation::Multiply | FheOperation::MultiplyPlaintext => {
            mul_overflow_occurred(op_coefficients, p)
        }
        FheOperation::Add | FheOperation::AddPlaintext => add_overflow_occurred(op_coefficients, p),
        FheOperation::Sub | FheOperation::SubPlaintext => sub_overflow_occurred(op_coefficients, p),
        _ => false,
    }
}

pub fn add_overflow_occurred(operands: [Vec<Vec<u64>>; 2], p: u64) -> bool {
    for (c0, c1) in operands[0].iter().zip(operands[1].iter()) {
        // Addition overflow
        for i in 0..c0.len() {
            let sum = c0[i] + c1[i];
            if (c0[i] > p / 2 && c1[i] > p / 2 && sum <= 3 * p / 2)
                || (c0[i] <= p / 2 && c1[i] <= p / 2 && sum > p / 2)
            {
                return true;
            }
        }
    }
    false
}

pub fn sub_overflow_occurred(operands: [Vec<Vec<u64>>; 2], p: u64) -> bool {
    let negated_coeffs = operands[1]
        .iter()
        .map(|vec| vec.iter().map(|x| p - x).collect())
        .collect();
    let new_operands = [operands[0].clone(), negated_coeffs];
    add_overflow_occurred(new_operands, p)
}

pub fn mul_overflow_occurred(operands: [Vec<Vec<u64>>; 2], p: u64) -> bool {
    for (poly1, poly2) in operands[0].iter().zip(&operands[1]) {
        let product = polynomial_mult(poly1, poly2);
        let product_mod = polynomial_mult_mod(poly1, poly2, p);

        for (coeff, coeff_mod) in product.iter().zip(&product_mod) {
            let signed_coeff = if *coeff_mod > p / 2 {
                *coeff_mod as i64 - p as i64
            } else {
                *coeff_mod as i64
            };
            if *coeff as i64 != signed_coeff {
                return true;
            }
        }
    }
    false
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
pub fn decrypt_inner_cipher(inner_cipher: InnerCiphertext, sk: &SecretKey) -> Vec<Vec<u64>> {
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

pub fn decrypt_inner_plain(inner_plain: InnerPlaintext) -> Vec<Vec<u64>> {
    let mut coefficients: Vec<Vec<u64>> = Vec::new();

    for i in 0..inner_plain.as_seal_plaintext().unwrap().len() {
        let inner = inner_plain.as_seal_plaintext().unwrap().get(i).unwrap();
        let mut inner_coefficients = Vec::new();
        for j in 0..inner.len() {
            inner_coefficients.push(inner.get_coefficient(j));
        }
        coefficients.push(inner_coefficients);
    }
    coefficients
}

fn create_ciphertext_from_seal_data(ct: SealCiphertext, pk: &PrivateKey) -> InnerCiphertext {
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

fn create_plaintext_from_seal_data(pt: SealPlaintext, pk: &PrivateKey) -> InnerPlaintext {
    let with_context = WithContext {
        params: pk.0.params.clone(),
        data: pt.clone(),
    };

    let sunscreen_plaintext = crate::Plaintext {
        // WARNING: this is garbage data, so we can't return a Plaintext whose value makes sense
        data_type: Type {
            is_encrypted: false,
            name: "plaintext".to_owned(),
            version: Version::new(1, 1, 1),
        },
        inner: InnerPlaintext::Seal {
            value: vec![with_context],
        },
    };
    sunscreen_plaintext.inner
}

#[derive(Clone, Serialize)]
#[serde(transparent)]
pub struct ZkpNodeType {
    // Send `BigInt` values as strings
    pub value: BigInt,
}

#[test]
fn test_get_mul_depth() {}

#[test]
fn test_add_overflow() {
    // Positive + Positive Overflow (6 + 4 > 7)
    assert!(add_overflow_occurred(
        [vec![vec![6, 5]], vec![vec![4, 6]]],
        13
    ));

    // Positive + Positive Non-overflow
    assert!(!add_overflow_occurred(
        [vec![vec![2, 5]], vec![vec![1, 6]]],
        23
    ));

    // Negative + Negative Overflow (6 = -3, 7 = -2, -3 + -2 = -5 < -4).
    assert!(add_overflow_occurred(
        [vec![vec![2, 6]], vec![vec![1, 7]]],
        9
    )); 

    // Negative + Negative Non-overflow
    assert!(!add_overflow_occurred(
        [vec![vec![2, 28]], vec![vec![1, 20]]],
        29
    )); 

    // Positive + Negative never overflows
    assert!(!add_overflow_occurred(
        [vec![vec![1, 28]], vec![vec![15, 14]]],
        29
    )); 

}

#[test]
fn test_mul_overflow() {
    // Overflow occurs during coefficient multiplication
    assert!(mul_overflow_occurred(
        [vec![vec![1, 5]], vec![vec![1, 5]]],
        37
    )); 

    // Overflow occurs during addition after multiplications
    assert!(mul_overflow_occurred(
        [vec![vec![5, 5]], vec![vec![5, 5]]],
        59
    )); 

    // No overflow
    assert!(!mul_overflow_occurred(
        [vec![vec![1, 5]], vec![vec![2, 5]]],
        101
    )); 
}
