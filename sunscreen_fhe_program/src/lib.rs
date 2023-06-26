#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the types for manipulating the intermediate representation
//! for Sunscreen's compiler backend.

mod error;
mod literal;
mod operation;

mod validation;

use petgraph::{
    algo::toposort,
    algo::tred::*,
    graph::{Graph, NodeIndex},
    stable_graph::StableGraph,
    visit::IntoNeighbors,
};
use serde::{Deserialize, Serialize};

pub use error::*;
pub use literal::*;
pub use operation::*;
pub use seal_fhe::SecurityLevel;

use sunscreen_compiler_common::{CompilationResult, Context, EdgeInfo, NodeInfo};

use std::collections::HashSet;

#[derive(Debug, Clone, Copy, Serialize, Hash, Deserialize, PartialEq, Eq)]
/**
 * Sunscreen supports the BFV scheme.
 */
pub enum SchemeType {
    /**
     *
     * # Remarks
     * [BFV](https://eprint.iacr.org/2012/144.pdf) is a leveled scheme on polynomials in a cyclotomic
     * ring. The coefficients of a plaintext form a 2x(N/2) matrix (where N is the polynomial degree).
     * Sunscreen automatically chooses the polynomial degree depending on the FHE program. Each coefficient is
     * an integer mod p (p is a scheme parameter and is the plaintext modulus). One can encode several different
     * meanings onto these coefficients:
     *
     * * An integer x modulo p by setting the x^0 term to x and the remaining terms to 0 (i.e. scalar encoder).
     * This encoding requires p be the desired maximum representable value. Overflow causes wrapping as
     * one would expect. This encoding is generally inefficient.
     * * An integer x decomposed into digits, where each digit is a coefficient in the plaintext polynomial.
     * One may represent numbers larger than p with this technique. P should be chosen to accomodate the number
     * of operations one wishes to perform so that no digit overflows under addition and multiplication. Overflow
     * causes weird answers. Since this encoding typically allows for a smaller plaintext modulo, Sunscreen
     * can choose parameters that result in low latency.
     * * A 2x(N/2) Batched vector of integers modulo p. Overflow wraps lane-wise, as expected. This encoding
     * generally maximizes throughput when calulating many numbers. While the representation forms a matrix,
     * multiplication and addition both execute element-wise; multiplication is *not* defined as matrix multiplation.
     * This Batched computation is also referred to on the literature as batching.
     *
     * Each of these encoding schemes supports both signed and unsigned values.
     *
     * Under BFV, each homomorphic operation introduces noise, with ciphertext-ciphertext multiplication
     * creating the most by a quadratic margin. Additionally, multiplication is the slowest operation. To
     * reduce noise under repeated multiplications, Sunscreen will automatically insert relinearization operations.
     *
     * After some number of operations (parameter-dependent), ciphertexts contain too much noise and
     * decryption results in garbled data. Sunscreen automatically chooses the parameters to accomodate
     * the noise growth in a given FHE program at the expense of execution speed.
     *
     * One can think of parameters as a tradeoff between accomodating more noise and faster execution. For a given security
     * level, there are several possible parameter sets. These sets are ordered from accomodating the smallest
     * level of noise to largest. Moving from one set to the next results in every operation requiring ~4x the
     * runtime, but also results in 2x the Batched lanes. Thus, when using Batched plaintexts, the amortized
     * throughput resulting from using the next parameter set is 2x lower than the previous. The smallest 2
     * parameter sets fail to even generate relinearization keys and fail to even perform a single multiplication
     * when using batching, while the largest can perform over 25 multiplications with batching.
     *
     * When using Batched, Sunscreen supports rotating column Batched lanes left and right and switching the rows
     * of the matrix.
     *
     * Pros:
     * * Most efficient way to do integer artithmetic.
     * * Exact values.
     * * Good ciphertext expansion when using batching.
     * * Galois keys (needed if FHE program does rotations or row swapping) can be compactly generated.
     * * Relinearization keys (needed if FHE program does multiplications) can be compactly generated.
     *
     * Cons:
     * * Bootstrapping not natively supported and isn't fast if one does implement it.
     * * Some operations (e.g. comparison, division) are not easy to implement and any implementation
     * will be approximate and/or particular to the scheme parameters.
     */
    Bfv,
}

impl From<SchemeType> for u8 {
    /**
     * Creates a serializable byte representation of the scheme type.
     */
    fn from(val: SchemeType) -> Self {
        match val {
            SchemeType::Bfv => 0,
        }
    }
}

impl TryFrom<u8> for SchemeType {
    type Error = Error;

    /**
     * Converts a serialized scheme type back into a [`SchemeType`].
     */
    fn try_from(val: u8) -> Result<Self> {
        Ok(match val {
            0 => Self::Bfv,
            _ => Err(Error::InvalidSchemeType)?,
        })
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
/**
 * The type of output from an Fhe Program's graph node.
 */
pub enum OutputType {
    /**
     * The output is a plaintext.
     */
    Plaintext,

    /**
     * The output is a ciphertext.
     */
    Ciphertext,
}

/**
 * A trait for getting whether a node produces plaintext or ciphertext values.
 */
pub trait OutputTypeTrait {
    /**
     * Gets the output type for the current node.
     */
    fn output_type(&self) -> OutputType;
}

impl OutputTypeTrait for NodeInfo<Operation> {
    fn output_type(&self) -> OutputType {
        match self.operation {
            Operation::InputPlaintext(_) => OutputType::Plaintext,
            Operation::Literal(_) => OutputType::Plaintext,
            _ => OutputType::Ciphertext,
        }
    }
}

/**
 * The intermediate representation for an FHE program used in the
 * compiler back-end.
 */
pub type FheProgram = Context<Operation, SchemeType>;

/**
 * Extension methods for [`FheProgram`].
 */
pub trait FheProgramTrait {
    /**
     * Appends a negate operation that depends on operand `x`.
     */
    fn add_negate(&mut self, x: NodeIndex) -> NodeIndex;

    /**
     * Appends a multiply operation that depends on the operands `x` and `y`.
     */
    fn add_multiply(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex;

    /**
     * Appends a multiply operation that depends on the operands `x` and `y`.
     */
    fn add_multiply_plaintext(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex;

    /**
     * Appends an add operation that depends on the operands `x` and `y`.
     */
    fn add_add(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex;

    /**
     * Appends a subtract operation that depends on the operands `x` and `y`.
     */
    fn add_sub(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex;

    /**
     * Appends an input ciphertext with the given name.
     */
    fn add_input_ciphertext(&mut self, id: usize) -> NodeIndex;

    /**
     * Appends an input plaintext with the given name.
     */
    fn add_input_plaintext(&mut self, id: usize) -> NodeIndex;

    /**
     * Appends a constant literal.
     *
     * * `value`: The integer or floating-point value in the literal.
     */
    fn add_input_literal(&mut self, value: Literal) -> NodeIndex;

    /**
     * Adds a node designating `x` as an output of the FHE program.
     */
    fn add_output_ciphertext(&mut self, x: NodeIndex) -> NodeIndex;

    /**
     * Appends an operation that relinearizes `x`.
     */
    fn add_relinearize(&mut self, x: NodeIndex) -> NodeIndex;

    /**
     * Appends an operation that rotates ciphertext `x` left by the literal node at `y` places.
     *
     * # Remarks
     * Recall that BFV has 2 rows in a Batched vector. This rotates each row.
     * CKKS has one large vector.
     */
    fn add_rotate_left(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex;

    /**
     * Appends an operation that rotates ciphertext `x` right by the literal node at `y` places.
     *
     * # Remarks
     * Recall that BFV has 2 rows in a Batched vector. This rotates each row.
     * CKKS has one large vector.
     */
    fn append_rotate_right(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex;

    /**
     * Returns the node indices of output ciphertexts
     */
    fn get_outputs(&self) -> Box<dyn Iterator<Item = NodeIndex> + '_>;

    /**
     * Returns the number of inputs ciphertexts this FHE program takes.
     */
    fn num_inputs(&self) -> usize;

    /**
     * Runs tree shaking and returns a derived FheProgram with only
     * dependencies required to run the requested nodes.
     *
     * * `nodes`: indices specifying a set of nodes in the graph. Prune return a new
     *   [`FheProgram`] containing nodes in the transitive closure
     *   of this set.
     */
    fn prune(&self, nodes: &[NodeIndex]) -> Self;

    /**
     * Validates this [`FheProgram`] for correctness.
     */
    fn validate(&self) -> Result<()>;

    /**
     * Whether or not this FHE program needs relin keys to run. Needed for relinearization.
     */
    fn requires_relin_keys(&self) -> bool;

    /**
     * Whether or not this FHE program requires Galois keys to run. Needed for rotation and row swap
     * operations.
     */
    fn requires_galois_keys(&self) -> bool;
}

impl FheProgramTrait for FheProgram {
    fn add_negate(&mut self, x: NodeIndex) -> NodeIndex {
        self.add_unary_operation(Operation::Negate, x)
    }

    fn add_multiply(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.add_binary_operation(Operation::Multiply, x, y)
    }

    fn add_multiply_plaintext(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.add_binary_operation(Operation::MultiplyPlaintext, x, y)
    }

    fn add_add(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.add_binary_operation(Operation::Add, x, y)
    }

    fn add_sub(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.add_binary_operation(Operation::Sub, x, y)
    }

    fn add_input_ciphertext(&mut self, id: usize) -> NodeIndex {
        self.add_node(Operation::InputCiphertext(id))
    }

    fn add_input_plaintext(&mut self, id: usize) -> NodeIndex {
        self.add_node(Operation::InputPlaintext(id))
    }

    fn add_input_literal(&mut self, value: Literal) -> NodeIndex {
        self.add_node(Operation::Literal(value))
    }

    fn add_output_ciphertext(&mut self, x: NodeIndex) -> NodeIndex {
        self.add_unary_operation(Operation::OutputCiphertext, x)
    }

    fn add_relinearize(&mut self, x: NodeIndex) -> NodeIndex {
        self.add_unary_operation(Operation::Relinearize, x)
    }

    fn add_rotate_left(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.add_binary_operation(Operation::ShiftLeft, x, y)
    }

    fn append_rotate_right(&mut self, x: NodeIndex, y: NodeIndex) -> NodeIndex {
        self.add_binary_operation(Operation::ShiftRight, x, y)
    }

    fn get_outputs(&self) -> Box<dyn Iterator<Item = NodeIndex> + '_> {
        Box::new(
            self.graph
                .node_indices()
                .filter(|g| matches!(self.graph[*g].operation, Operation::OutputCiphertext)),
        )
    }

    fn num_inputs(&self) -> usize {
        self.graph
            .node_weights()
            .filter(|n| matches!(n.operation, Operation::InputCiphertext(_)))
            .count()
    }

    fn prune(&self, nodes: &[NodeIndex]) -> FheProgram {
        let mut compact_graph = Graph::from(self.graph.0.clone());
        compact_graph.reverse();

        let topo = toposort(&compact_graph, None).unwrap();
        let (res, revmap) = dag_to_toposorted_adjacency_list(&compact_graph, &topo);
        let (_, closure) = dag_transitive_reduction_closure(&res);

        let mut closure_set = HashSet::new();

        let mut visit: Vec<NodeIndex> = vec![];

        for n in nodes {
            let mapped_id = revmap[n.index()];
            visit.push(mapped_id);
            closure_set.insert(mapped_id);
        }

        while !visit.is_empty() {
            let node = visit.pop().expect("Fatal error: prune queue was empty.");

            for edge in closure.neighbors(node) {
                if !closure_set.contains(&edge) {
                    closure_set.insert(edge);
                    visit.push(edge);
                }
            }
        }

        compact_graph.reverse();

        let pruned = compact_graph.filter_map(
            |id, n| {
                // Don't prune input nodes.
                let is_input = matches!(
                    n.operation,
                    Operation::InputPlaintext(_) | Operation::InputCiphertext(_)
                );

                if closure_set.contains(&revmap[id.index()]) || is_input {
                    Some(n.clone())
                } else {
                    None
                }
            },
            |_, e| Some(*e),
        );

        Self {
            data: self.data,
            graph: CompilationResult(StableGraph::from(pruned)),
            #[cfg(feature = "debug")]  // TODO: need to make sure that every construction of a Context object passes in group id
            group_id: self.group_id
        }
    }

    fn validate(&self) -> Result<()> {
        let errors = validation::validate_ir(self);

        if !errors.is_empty() {
            return Err(Error::ir_error(&errors));
        }

        Ok(())
    }

    fn requires_relin_keys(&self) -> bool {
        self.graph
            .node_weights()
            .any(|n| matches!(n.operation, Operation::Relinearize))
    }

    fn requires_galois_keys(&self) -> bool {
        self.graph.node_weights().any(|n| {
            matches!(
                n.operation,
                Operation::ShiftRight | Operation::ShiftLeft | Operation::SwapRows
            )
        })
    }
}

#[cfg(test)]
mod tests {
    use petgraph::algo::is_isomorphic_matching;

    use super::*;

    fn eq(a: &FheProgram, b: &FheProgram) -> bool {
        is_isomorphic_matching(
            &Graph::from(a.graph.0.clone()),
            &Graph::from(b.graph.0.clone()),
            |n1, n2| n1 == n2,
            |e1, e2| e1 == e2,
        )
    }

    #[test]
    fn can_prune_ir() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let ct = ir.add_input_ciphertext(0);
        let l1 = ir.add_input_literal(Literal::from(7u64));
        let add = ir.add_add(ct, l1);
        let l2 = ir.add_input_literal(Literal::from(5u64));
        ir.add_multiply(add, l2);

        let pruned = ir.prune(&[add]);

        let mut expected_ir = FheProgram::new(SchemeType::Bfv);
        let ct = expected_ir.add_input_ciphertext(0);
        let l1 = expected_ir.add_input_literal(Literal::from(7u64));
        expected_ir.add_add(ct, l1);

        assert!(eq(&pruned, &expected_ir));
    }

    #[test]
    fn can_prune_graph_with_removed_nodes() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let ct = ir.add_input_ciphertext(0);
        let rem = ir.add_input_ciphertext(1);
        ir.graph.0.remove_node(rem);
        let l1 = ir.add_input_literal(Literal::from(7u64));
        let rem = ir.add_input_ciphertext(1);
        ir.graph.0.remove_node(rem);
        let add = ir.add_add(ct, l1);
        let rem = ir.add_input_ciphertext(1);
        ir.graph.0.remove_node(rem);
        let l2 = ir.add_input_literal(Literal::from(5u64));
        ir.add_multiply(add, l2);
        let rem = ir.add_input_ciphertext(1);
        ir.graph.0.remove_node(rem);

        let pruned = ir.prune(&[add]);

        let mut expected_ir = FheProgram::new(SchemeType::Bfv);
        let ct = expected_ir.add_input_ciphertext(0);
        let l1 = expected_ir.add_input_literal(Literal::from(7u64));
        expected_ir.add_add(ct, l1);

        assert!(eq(&pruned, &expected_ir));
    }

    #[test]
    fn can_prune_with_multiple_nodes() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let ct1 = ir.add_input_ciphertext(0);
        let ct2 = ir.add_input_ciphertext(1);
        let ct3 = ir.add_input_ciphertext(2);
        let neg1 = ir.add_negate(ct1);
        let neg2 = ir.add_negate(ct2);
        let neg3 = ir.add_negate(ct3);
        let o1 = ir.add_output_ciphertext(neg1);
        ir.add_output_ciphertext(neg2);
        ir.add_output_ciphertext(neg3);

        let pruned = ir.prune(&[o1, neg2]);

        let mut expected_ir = FheProgram::new(SchemeType::Bfv);
        let ct1 = expected_ir.add_input_ciphertext(0);
        let ct2 = expected_ir.add_input_ciphertext(1);
        let _ct3 = expected_ir.add_input_ciphertext(2);
        let neg1 = expected_ir.add_negate(ct1);
        expected_ir.add_negate(ct2);
        expected_ir.add_output_ciphertext(neg1);

        assert!(eq(&pruned, &expected_ir));
    }

    #[test]
    fn pruning_empty_node_list_results_in_inputs_only() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let ct1 = ir.add_input_ciphertext(0);
        let ct2 = ir.add_input_ciphertext(1);
        let ct3 = ir.add_input_ciphertext(2);
        let neg1 = ir.add_negate(ct1);
        let neg2 = ir.add_negate(ct2);
        let neg3 = ir.add_negate(ct3);
        ir.add_output_ciphertext(neg1);
        ir.add_output_ciphertext(neg2);
        ir.add_output_ciphertext(neg3);

        let pruned = ir.prune(&[]);

        let mut expected_ir = FheProgram::new(SchemeType::Bfv);
        let _ct1 = expected_ir.add_input_ciphertext(0);
        let _ct2 = expected_ir.add_input_ciphertext(1);
        let _ct3 = expected_ir.add_input_ciphertext(2);

        assert!(eq(&pruned, &expected_ir));
    }

    #[test]
    fn can_roundtrip_scheme_type() {
        let schemes = [SchemeType::Bfv];
        for s in schemes {
            let s_2: u8 = s.into();
            let s_2 = SchemeType::try_from(s_2).unwrap();

            assert_eq!(s, s_2);
        }
    }
}
