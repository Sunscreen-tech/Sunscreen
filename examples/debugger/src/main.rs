use actix_web::main;
use sunscreen::{
    types::{bfv::Signed, Cipher},
    *,
};

#[actix_web::main]
async fn main() {
    #[fhe_program(scheme = "bfv")]
    fn mad(a: Cipher<Signed>, b: Signed, c: Cipher<Signed>) -> Cipher<Signed> {
        a * b + c
    }

    #[fhe_program(scheme = "bfv")]
    fn add_squares(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a*a + b*b
    }

    let app = Compiler::new().fhe_program(mad).fhe_program(add_squares).compile().unwrap();

    let runtime = Runtime::new_fhe(app.params()).unwrap();

    let (public, private) = runtime.generate_keys().unwrap();

    let a = runtime.encrypt(Signed::from(20), &public).unwrap();
    let b = Signed::from(13);
    let c = a.clone();

    let args1: Vec<FheProgramInput> = vec![a.clone().into(), b.clone().into(), c.clone().into()];
    
    runtime
        .debug_fhe_program(
            app.get_fhe_program("mad").unwrap(),
            args1,
            &public,
            &private.0,
        )
        .await;

    // TODO: figure out how to set it up so that we can have multiple running at the same time
        // maybe set up a server once at the start of the main method, then just have endpoints like
        // /programs/{function name} to be able to see
    let args2: Vec<FheProgramInput> = vec![a.clone().into(), b.clone().into()];

    runtime
        .debug_fhe_program(
            app.get_fhe_program("add_squares").unwrap(),
            args2,
            &public,
            &private.0,
        )
        .await;
}