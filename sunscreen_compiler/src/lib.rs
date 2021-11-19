mod error;
mod transforms;

use error::*;
use sunscreen_ir::IntermediateRepresentation;

pub fn validate(_ir: &IntermediateRepresentation) -> Result<()> {
    // TODO: validate the program.

    Ok(())
}
