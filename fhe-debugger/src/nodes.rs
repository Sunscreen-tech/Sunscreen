use sunscreen::{Ciphertext, Plaintext};

/**
 * A node in the directed graph representing the FHE program.
 */
struct FHEExpressionTreeNode {
/**
 * The ID of the ExpressionTreeNode in the debugger graph.
 */
    node_id: u64,

/**
 * The label/name of the ExpressionTreeNode in the debugger graph.
 */

    label: String,

/**
 * The node_id's of the parent nodes of the ExpressionTreeNode.
 */
    parent_nodes: vec![u64],

/**
 * The node_id's of the child nodes of the ExpressionTreeNode.
 */
    child_nodes: vec![u64],

/**
 * The node_id's of the ExpressionTreeNodes of the subgraph corresponding
 * to the operation of the current ExpressionTreeNode.
 */
    group_nodes: vec![u64],

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

impl FHEExpressionTreeNode {


}