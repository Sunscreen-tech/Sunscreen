mod insert_relinearizations;

use petgraph::stable_graph::NodeIndex;
use sunscreen_fhe_program::{FheProgram, FheProgramTrait};

use insert_relinearizations::apply_insert_relinearizations;

pub fn transform_intermediate_representation(ir: &mut FheProgram) {
    apply_insert_relinearizations(ir);

    // Dead code elimination.
    *ir = ir.prune(&ir.get_outputs().collect::<Vec<NodeIndex>>());
}
