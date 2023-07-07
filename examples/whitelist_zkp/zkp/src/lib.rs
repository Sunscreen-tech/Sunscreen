use std::array;

use sunscreen::{types::zkp::NativeField, zkp_program, zkp_var, BackendField};

/// A ZKP proving a private entry is equal to one of the values in a list.
#[zkp_program]
pub fn whitelist<F: BackendField>(entry: NativeField<F>, #[public] list: [NativeField<F>; 100]) {
    let zero = zkp_var!(0);
    let one = zkp_var!(1);
    let mut poly = one;
    for x in list {
        poly = poly * (x - entry);
    }
    poly.constrain_eq(zero);
}

/// A default list for the prover and verifier to use: [100, 199]
pub fn default_list<F: BackendField>() -> [NativeField<F>; 100] {
    array::from_fn(|i| NativeField::from(100 + i as u32))
}
