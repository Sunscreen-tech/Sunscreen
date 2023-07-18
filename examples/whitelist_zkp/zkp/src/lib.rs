use std::array;

use sunscreen::{types::zkp::Field, zkp_program, zkp_var, FieldSpec};

/// A ZKP proving a private entry is equal to one of the values in a list.
#[zkp_program]
pub fn whitelist<F: FieldSpec>(entry: Field<F>, #[public] list: [Field<F>; 100]) {
    let zero = zkp_var!(0);
    let one = zkp_var!(1);
    let mut poly = one;
    for x in list {
        poly = poly * (x - entry);
    }
    poly.constrain_eq(zero);
}

/// A default list for the prover and verifier to use: [100, 199]
pub fn default_list<F: FieldSpec>() -> [Field<F>; 100] {
    array::from_fn(|i| Field::from(100 + i as u32))
}
