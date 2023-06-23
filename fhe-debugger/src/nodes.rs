use sunscreen::{Ciphertext, Plaintext};

/**
 * A node in the directed graph representing the FHE program.
 */
struct ExpressionTreeNode {
/**
 * The ID of the ExpressionTreeNode in the debugger graph.
 */
    node_id: Hash,

/**
 * The label/name of the ExpressionTreeNode in the debugger graph.
 */

    label: String,

/**
 * The node_id's of the parent nodes of the ExpressionTreeNode.
 */
    parent_nodes: vec![Hash],

/**
 * The node_id's of the child nodes of the ExpressionTreeNode.
 */
    child_nodes: vec![Hash],

/**
 * The node_id's of the ExpressionTreeNodes of the subgraph corresponding
 * to the operation of the current ExpressionTreeNode.
 */
    group_nodes: vec![Hash],

/**
 * The list of ciphertext/plaintext inputs to the ExpressionTreeNode.
 */
    inputs: vec![sunscreen::Ciphertext | sunscreen::Plaintext],

/**
 * The ciphertext output from the ExpressionTreeNode.
 */
    output: sunscreen::Ciphertext,

/**
 * The maximum of the multiplicative depths taken over the set of ciphertext/plaintext inputs.
 */
    local_multiplicative_depth: u32 
}

impl ExpressionTreeNode {



}