use sunscreen::*;

fn main() {
    #[fhe_program(scheme = "bfv")]
    fn mad(a: Cipher<Signed>, b: Signed, c: Cipher<Signed>) -> Cipher<Signed> {
        a * b + c
    }

    let app = Compiler::new().fhe_program(mad).compile().unwrap();

    let runtime = Runtime::new_fhe(app.params()).unwrap();

    let (public, private) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(20), &public).unwrap();
    let b = Signed::from(13);
    let c = a.clone();

    let args: Vec<FheProgramInput> = vec![
        a.into(),
        b.into(),
        c.into()
    ];

    runtime.debug_fhe_program(mad, args, &public, &private);
}
