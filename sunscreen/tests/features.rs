use sunscreen::{
    types::{bfv::Signed, Cipher},
    Compiler,
};
use sunscreen_compiler_macros::fhe_program;
use sunscreen_runtime::{FheProgramInput, Runtime};

#[cfg(not(feature = "transparent-ciphertexts"))]
mod transparent_ciphertexts {
    use super::*;

    #[test]
    #[should_panic]
    fn panics_on_transparent_ciphertext() {
        #[fhe_program(scheme = "bfv")]
        fn add(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
            a * b
        }

        let app = Compiler::new().fhe_program(add).compile().unwrap();

        let runtime = Runtime::new_fhe(app.params()).unwrap();

        let (public, _) = runtime.generate_keys().unwrap();

        let a = runtime.encrypt(Signed::from(42), &public).unwrap();

        let args: Vec<FheProgramInput> = vec![a.into(), Signed::from(0).into()];

        runtime
            .run(app.get_fhe_program(add).unwrap(), args, &public)
            .unwrap();
    }
}

#[cfg(feature = "transparent-ciphertexts")]
mod transparent_ciphertexts {
    use super::*;

    #[test]
    fn no_panic_on_transparent_ciphertext() {
        #[fhe_program(scheme = "bfv")]
        fn add(a: Cipher<Signed>, b: Signed) -> Cipher<Signed> {
            a * b
        }

        let app = Compiler::new().fhe_program(add).compile().unwrap();

        let runtime = Runtime::new_fhe(app.params()).unwrap();

        let (public, _) = runtime.generate_keys().unwrap();

        let a = runtime.encrypt(Signed::from(42), &public).unwrap();

        let args: Vec<FheProgramInput> = vec![a.into(), Signed::from(0).into()];

        runtime
            .run(app.get_fhe_program(add).unwrap(), args, &public)
            .unwrap();
    }
}
