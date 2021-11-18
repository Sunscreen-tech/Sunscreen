mod insert_relinearizations;

use sunscreen_ir::IntermediateRepresentation;
use petgraph::stable_graph::NodeIndex;

use insert_relinearizations::apply_insert_relinearizations;

pub fn transform_intermediate_represenation(ir: &mut IntermediateRepresentation) {
    apply_insert_relinearizations(ir);
    
    // Dead code elimination.
    *ir = ir.prune(&ir.get_outputs().collect::<Vec<NodeIndex>>());
}
