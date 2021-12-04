use sunscreen_frontend_macros::circuit;
use sunscreen_frontend_types::{
    types::Signed, Params, SchemeType, SecurityLevel, CURRENT_CTX
};

use serde_json::json;

fn get_params() -> Params {
    Params {
        lattice_dimension: 1024,
        plain_modulus: 1024,
        coeff_modulus: vec![1, 2, 3, 4],
        security_level: SecurityLevel::TC128,
        scheme_type: SchemeType::Bfv,
    }
}

#[test]
fn circuit_gets_called() {
    static mut FOO: u32 = 0;

    #[circuit]
    fn simple_circuit() {
        unsafe {
            FOO = 20;
        };
    }

    simple_circuit(&get_params());

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
        panic_circuit(&get_params());
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

    let context = circuit_with_args(&get_params());

    assert_eq!(context.graph.node_count(), 4);
}

#[test]
fn can_add() {
    #[circuit]
    fn circuit_with_args(a: Signed, b: Signed, c: Signed) {
        let _ = a + b + c;
    }

    let context = circuit_with_args(&get_params());

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
        },
        "scheme": "Bfv"
    });

    assert_eq!(context, serde_json::from_value(expected).unwrap());
}

#[test]
fn can_mul() {
    #[circuit]
    fn circuit_with_args(a: Signed, b: Signed, c: Signed) {
        let _ = a * b * c;
    }

    let context = circuit_with_args(&get_params());

    let expected = json!({
        "graph": {
            "nodes": [
                "InputCiphertext",
                "InputCiphertext",
                "InputCiphertext",
                "Multiply",
                "Multiply"
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
        },
        "scheme": "Bfv"
    });

    assert_eq!(context, serde_json::from_value(expected).unwrap());
}

#[test]
fn can_rotate_left() {
    #[circuit]
    fn circuit_with_args(a: Signed) {
        let _ = a << 4;
    }

    let context = circuit_with_args(&get_params());

    let expected = json!({
        "graph": {
            "nodes": [
                "InputCiphertext",
                {
                    "Literal": {
                      "U64": 4
                    }
                },
                "RotateLeft",
            ],
            "node_holes": [],
            "edge_property": "directed",
            "edges": [
                [
                    0,
                    2,
                    "Left"
                ],
                [
                    1,
                    2,
                    "Right"
                ]
            ]
        },
        "scheme": "Bfv"
    });

    assert_eq!(context, serde_json::from_value(expected).unwrap());
}

#[test]
fn can_rotate_right() {
    #[circuit]
    fn circuit_with_args(a: Signed) {
        let _ = a >> 4;
    }

    let context = circuit_with_args(&get_params());

    let expected = json!({
        "graph": {
            "nodes": [
                "InputCiphertext",
                {
                    "Literal": {
                      "U64": 4
                    }
                },
                "RotateRight",
            ],
            "node_holes": [],
            "edge_property": "directed",
            "edges": [
                [
                    0,
                    2,
                    "Left"
                ],
                [
                    1,
                    2,
                    "Right"
                ]
            ]
        },
        "scheme": "Bfv"
    });

    assert_eq!(context, serde_json::from_value(expected).unwrap());
}

#[test]
fn can_collect_output() {
    #[circuit]
    fn circuit_with_args(a: Signed, b: Signed) -> Signed {
        a + b * a
    }

    let context = circuit_with_args(&get_params());

    let expected = json!({
      "graph": {
        "nodes": [
          "InputCiphertext",
          "InputCiphertext",
          "Multiply",
          "Add",
          "Output"
        ],
        "node_holes": [],
        "edge_property": "directed",
        "edges": [
          [
            1,
            2,
            "Left"
          ],
          [
            0,
            2,
            "Right"
          ],
          [
            0,
            3,
            "Left"
          ],
          [
            2,
            3,
            "Right"
          ],
          [
            3,
            4,
            "Unary"
          ]
        ]
      },
      "scheme": "Bfv"
    });

    assert_eq!(context, serde_json::from_value(expected).unwrap());
}

#[test]
fn can_collect_multiple_outputs() {
    #[circuit]
    fn circuit_with_args(a: Signed, b: Signed) -> (Signed, Signed) {
        (a + b * a, a)
    }

    let context = circuit_with_args(&get_params());

    let expected = json!({
        "graph": {
          "nodes": [
            "InputCiphertext",
            "InputCiphertext",
            "Multiply",
            "Add",
            "Output",
            "Output"
          ],
          "node_holes": [],
          "edge_property": "directed",
          "edges": [
            [
              1,
              2,
              "Left"
            ],
            [
              0,
              2,
              "Right"
            ],
            [
              0,
              3,
              "Left"
            ],
            [
              2,
              3,
              "Right"
            ],
            [
              3,
              4,
              "Unary"
            ],
            [
              0,
              5,
              "Unary"
            ]
          ]
        },
        "scheme": "Bfv"
    });

    assert_eq!(context, serde_json::from_value(expected).unwrap());
}

#[test]
fn literals_consolidate() {
    #[circuit]
    fn circuit_with_args(a: Signed) {
        let _ = a << 4;
        let _ = a << 4;
        let _ = a << 3;
    }

    let context = circuit_with_args(&get_params());

    let expected = json!({
      "graph": {
        "nodes": [
          "InputCiphertext",
          {
            "Literal": {
              "U64": 4 // The literal 4 should be reused
            }
          },
          "RotateLeft",
          "RotateLeft",
          {
            "Literal": {
              "U64": 3
            }
          },
          "RotateLeft"
        ],
        "node_holes": [],
        "edge_property": "directed",
        "edges": [
          [
            0,
            2,
            "Left"
          ],
          [
            1,
            2,
            "Right"
          ],
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
            0,
            5,
            "Left"
          ],
          [
            4,
            5,
            "Right"
          ]
        ]
      },
      "scheme": "Bfv"
    });

    assert_eq!(context, serde_json::from_value(expected).unwrap());
}
