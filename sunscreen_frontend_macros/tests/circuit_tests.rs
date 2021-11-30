use sunscreen_frontend_macros::circuit;
use sunscreen_frontend_types::{Context, Signed, CURRENT_CTX};

use serde_json::json;

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
    fn circuit_with_args(_a: Signed, _b: Signed, _c: Signed, _d: Signed) {}

    let context = circuit_with_args();

    assert_eq!(context.graph.node_count(), 4);
}

#[test]
fn can_add() {
    #[circuit]
    fn circuit_with_args(a: Signed, b: Signed, c: Signed) {
        let _ = a + b + c;
    }

    let context = circuit_with_args();

    let expected = json!({
        "graph": {
            "nodes": [
                "InputCiphertext",
                "InputCiphertext",
                "InputCiphertext",
                "Add",
                "Add"
            ],
            "node_holes": [],
            "edge_property": "directed",
            "edges": [
                [
                    0,
                    3,
                    "Left"
                ],
                [
                    1,
                    3,
                    "Right"
                ],
                [
                    3,
                    4,
                    "Left"
                ],
                [
                    2,
                    4,
                    "Right"
                ]
            ]
        }
    });

    assert_eq!(context, serde_json::from_value(expected).unwrap());
}
