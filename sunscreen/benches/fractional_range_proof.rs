use criterion::{criterion_group, criterion_main, Criterion};
use sunscreen::{types::zkp::NativeField, *};

fn fractional_range_proof(c: &mut Criterion) {
    #[zkp_program(backend = "bulletproofs")]
    fn in_range<F: BackendField>(a: [NativeField<F>; 8]) {}
}

criterion_group!(benches, fractional_range_proof);
criterion_main!(benches);
