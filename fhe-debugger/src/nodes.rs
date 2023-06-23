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

    fn get_id(&self) {
/**
 * Returns the node ID of the current ExpressionTreeNode.
 */
        self.node_id
    }

    fn get_label(&self) {
/**
 * Returns the label/name of the current ExpressionTreeNode.
 */
        self.label
    }

    fn get_parents(&self) {
/**
 * Returns the node ID's for parent nodes of the current ExpressionTreeNode.
 */
        self.parent_nodes
    }

    fn get_children(&self) {
/**
 * Returns the node ID's for child nodes of the current ExpressionTreeNode.
 */
        self.child_nodes
    }

    fn get_group(&self) {
/**
 * Returns the node ID's for parent nodes of the current ExpressionTreeNode.
 */
        self.parent_nodes
    }

    fn get_inputs(&self) {
        self.inputs 
    }

    fn get_output(&self){
        self.output 
    }

    fn get_mult_depth(&self) {
        self.local_multiplicative_depth
    }


}