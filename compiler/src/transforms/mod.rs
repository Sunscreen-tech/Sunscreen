mod insert_relinearizations;

use crate::IntermediateRepresentation;
use insert_relinearizations::apply_insert_relinearizations;

pub fn transform_intermediate_represenation(ir: &mut IntermediateRepresentation) {
    apply_insert_relinearizations(ir);
}
