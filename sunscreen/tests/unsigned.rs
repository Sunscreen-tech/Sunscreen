use crypto_bigint::U256;
use paste::paste;
use proptest::prelude::{prop::num::u64::ANY, prop_assert_eq, proptest, ProptestConfig};
use sunscreen::{
    fhe_program,
    types::{bfv::Unsigned256, Cipher},
    Compiler, FheApplication, FheProgramInput, FheRuntime, PrivateKey, PublicKey, Runtime,
};

// Darn, Application is no longer thread safe, no lazy init :(
// luckily proptest supports something like an expensive setup operation
// TODO tests for more than just 256?

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
        let rt: FheRuntime = Runtime::new_fhe(app.params()).unwrap();
        let (pk, sk) = rt.generate_keys().unwrap();
        Self { app, rt, pk, sk }
    }
}

#[test]
fn add_fhe_proptest() {
    let FheApp { app, rt, pk, sk } = FheApp::new();

    proptest!(ProptestConfig::with_cases(20), |(lhs in [ANY; 4], rhs in [ANY; 4])| {

        let a = U256::from_words(lhs);
        let a_c = rt.encrypt(Unsigned256::from(a), &pk).unwrap();
        let b = U256::from_words(rhs);
        let b_c = rt.encrypt(Unsigned256::from(b), &pk).unwrap();
        let args: Vec<FheProgramInput> = vec![a_c.into(), b_c.into()];

        let result = rt
            .run(app.get_fhe_program(add).unwrap(), args, &pk)
            .unwrap();

        let c: Unsigned256 = rt.decrypt(&result[0], &sk).unwrap();

        prop_assert_eq!(a.wrapping_add(&b), c.into())
    });
}
