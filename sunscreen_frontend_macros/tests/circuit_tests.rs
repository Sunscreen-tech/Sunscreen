use sunscreen_frontend_macros::circuit;
use sunscreen_frontend_types::{Context, CURRENT_CTX, Signed};

#[test]
fn circuit_gets_called() {
    static mut FOO: u32 = 0;
    
    #[circuit]
    fn simple_circuit() {
        unsafe {
            FOO = 20;
        };
    }

    simple_circuit();

    assert_eq!(unsafe { FOO }, 20);
}

#[test]
fn panicing_circuit_clears_ctx() {  
    #[circuit]
    fn panic_circuit() {
        CURRENT_CTX.with(|ctx| {
            let old = ctx.take();

            assert_eq!(old.is_some(), true);
            ctx.replace(old);
        });

        panic!("Oops");
    }

    let panic_result = std::panic::catch_unwind(|| {
        panic_circuit();
    });
    
    assert_eq!(panic_result.is_err(), true);
    
    CURRENT_CTX.with(|ctx| {
        let old = ctx.take();

        assert_eq!(old.is_none(), true);
    });
}

#[test]
fn compile_failures() {
    let t = trybuild::TestCases::new();

    t.compile_fail("tests/compile_failures/self_arg.rs");
}

#[test]
fn capture_circuit_input_args() {
    #[circuit]
    fn circuit_with_args(_a: Signed, _b: Signed) {
    }

    let context = circuit_with_args();

    assert_eq!(context.graph.node_count(), 2);
}