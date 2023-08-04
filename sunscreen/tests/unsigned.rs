use crypto_bigint::{Uint, U256, U64};
use lazy_static::lazy_static;
use paste::paste;
use proptest::prelude::{prop::num::u64::ANY, prop_assert_eq, proptest, ProptestConfig};
use sunscreen::{
    fhe_program,
    types::{
        bfv::{Unsigned, Unsigned256},
        Cipher,
    },
    Compiler, FheApplication, FheProgramInput, FheRuntime, PrivateKey, PublicKey,
};

macro_rules! fhe_program {
    ($(($op:ident, $binop:tt, $ty:ident)),+) => {
        $(
            paste! {
                #[fhe_program(scheme = "bfv")]
                fn $op(a: Cipher<$ty>, b: Cipher<$ty>) -> Cipher<$ty> {
                    a $binop b
                }
                #[fhe_program(scheme = "bfv")]
                fn [<$op _plain>](a: Cipher<$ty>, b: $ty) -> Cipher<$ty> {
                    a $binop b
                }
            }
        )+
     };
}

fhe_program! {
    (add, +, Unsigned256),
    (sub, -, Unsigned256),
    (mul, *, Unsigned256)
}

struct FheApp {
    app: FheApplication,
    rt: FheRuntime,
    pk: PublicKey,
    sk: PrivateKey,
}
impl FheApp {
    fn new() -> Self {
        let app: FheApplication = Compiler::new()
            .fhe_program(add)
            .fhe_program(add_plain)
            .fhe_program(sub)
            .fhe_program(sub_plain)
            .fhe_program(mul)
            .fhe_program(mul_plain)
            .compile()
            .unwrap();
        let rt: FheRuntime = FheRuntime::new(app.params()).unwrap();
        let (pk, sk) = rt.generate_keys().unwrap();
        Self { app, rt, pk, sk }
    }
}

lazy_static! {
    static ref FHE_APP: FheApp = FheApp::new();
}

macro_rules! op_proptest {
    ($($op:ident),+) => {
        $(
            paste! {
                #[test]
                fn [<$op _fhe_proptest>]() {
                    let FheApp { app, rt, pk, sk } = &*FHE_APP;

                    proptest!(ProptestConfig::with_cases(20), |(lhs in [ANY; 4], rhs in [ANY; 4])| {

                        // Test both operands as ciphertexts
                        let a = U256::from_words(lhs);
                        let a_c = rt.encrypt(Unsigned256::from(a), pk).unwrap();
                        let b = U256::from_words(rhs);
                        let b_c = rt.encrypt(Unsigned256::from(b), pk).unwrap();
                        let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_c.clone().into()];

                        let result = rt
                            .run(app.get_fhe_program($op).unwrap(), args, pk)
                            .unwrap();

                        let c: Unsigned256 = rt.decrypt(&result[0], &sk).unwrap();

                        prop_assert_eq!(a.[<wrapping_ $op>](&b), c.into());

                        // Test mixed ciphertexts and plaintexts
                        let args_mixed: Vec<FheProgramInput> = vec![a_c.into(), Unsigned256::from(b).into()];
                        let result_mixed = rt
                            .run(app.get_fhe_program([<$op _plain>]).unwrap(), args_mixed, pk)
                            .unwrap();

                        let c_mixed: Unsigned256 = rt.decrypt(&result_mixed[0], &sk).unwrap();

                        prop_assert_eq!(a.[<wrapping_ $op>](&b), c_mixed.into());
                    });
                }
            }
        )+
     };
}

op_proptest! {
    add,
    sub,
    mul
}

fn run_with<const L: usize, O1, O2, F>(a: Uint<L>, b: Uint<L>, op: F, fhe_op: O1, fhe_op_plain: O2)
where
    O1: AsRef<str>,
    O2: AsRef<str>,
    F: Fn(&Uint<L>, &Uint<L>) -> Uint<L>,
{
    let FheApp { app, rt, pk, sk } = &*FHE_APP;
    let a_u = Unsigned::from(a);
    let b_u = Unsigned::from(b);

    let a_c = rt.encrypt(a_u, pk).unwrap();
    let b_c = rt.encrypt(b_u, pk).unwrap();
    let args: Vec<FheProgramInput> = vec![a_c.clone().into(), b_c.into()];

    let result = rt
        .run(app.get_fhe_program(fhe_op).unwrap(), args, pk)
        .unwrap();

    let c: Unsigned<L> = rt.decrypt(&result[0], sk).unwrap();

    assert_eq!(op(&a, &b), c.into());

    // Same test but subtracting plaintext
    let args_mixed: Vec<FheProgramInput> = vec![a_c.into(), b_u.into()];
    let result_mixed = rt
        .run(app.get_fhe_program(fhe_op_plain).unwrap(), args_mixed, pk)
        .unwrap();

    let c_mixed: Unsigned<L> = rt.decrypt(&result_mixed[0], sk).unwrap();

    assert_eq!(op(&a, &b), c_mixed.into());
}

#[test]
fn underflow_wraps_properly() {
    // U256
    run_with(U256::ZERO, U256::ONE, U256::wrapping_sub, sub, sub_plain);
    // U64
    run_with(U64::ZERO, U64::ONE, U64::wrapping_sub, sub, sub_plain);
}

#[test]
fn overflow_wraps_properly() {
    // U256
    run_with(U256::MAX, U256::ONE, U256::wrapping_add, add, add_plain);
    // U64
    run_with(U64::MAX, U64::ONE, U64::wrapping_add, add, add_plain);
}

#[test]
fn carry_at_limb_boundary() {
    let a = U256::from_words([0, u64::MAX, 0, 0]);
    let b = U256::from_words([0, 1, 0, 0]);
    run_with(a, b, U256::wrapping_add, add, add_plain);
}
