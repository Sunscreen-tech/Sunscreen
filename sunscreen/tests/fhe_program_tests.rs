use sunscreen::{
    fhe::{FheFrontendCompilation, CURRENT_FHE_CTX},
    fhe_program,
    types::{bfv::Signed, Cipher, TypeName},
    CallSignature, FheProgramFn, Params, SchemeType, SecurityLevel,
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

/*
    TODO: these tests will all fail when we actually try to pass in metadata when constructing programs
    Need to add support for having `debugger` feature on, which means that metadata can't be an empty field.
    Will just do this by doing something like:
    #[cfg(feature = "debugger")]
    let expected = ...
        where this includes the metadata field
*/
#[test]
fn fhe_program_gets_called() {
    static mut FOO: u32 = 0;

    #[fhe_program(scheme = "bfv")]
    fn simple_fhe_program() {
        unsafe {
            FOO = 20;
        };
    }

    let expected_signature = CallSignature {
        arguments: vec![],
        returns: vec![],
        num_ciphertexts: vec![],
    };

    assert_eq!(simple_fhe_program.signature(), expected_signature);
    assert_eq!(simple_fhe_program.scheme_type(), SchemeType::Bfv);

    let _context = simple_fhe_program.build(&get_params()).unwrap();

    assert_eq!(unsafe { FOO }, 20);
}

#[test]
fn panicing_fhe_program_clears_ctx() {
    #[fhe_program(scheme = "bfv")]
    fn panic_fhe_program() {
        CURRENT_FHE_CTX.with(|ctx| {
            let old = ctx.take();

            assert!(old.is_some());
            ctx.replace(old);
        });

        panic!("Oops");
    }

    let panic_result = std::panic::catch_unwind(|| {
        let expected_signature = CallSignature {
            arguments: vec![],
            returns: vec![],
            num_ciphertexts: vec![],
        };

        assert_eq!(panic_fhe_program.signature(), expected_signature);
        assert_eq!(panic_fhe_program.scheme_type(), SchemeType::Bfv);

        let _context = panic_fhe_program.build(&get_params()).unwrap();
    });

    assert!(panic_result.is_err());

    CURRENT_FHE_CTX.with(|ctx| {
        let old = ctx.take();

        assert!(old.is_none());
    });
}

#[test]
fn capture_fhe_program_input_args() {
    #[fhe_program(scheme = "bfv")]
    fn fhe_program_with_args(_a: Signed, _b: Signed, _c: Signed, _d: Signed) {}

    assert_eq!(fhe_program_with_args.scheme_type(), SchemeType::Bfv);

    let type_name = Signed::type_name();

    let expected_signature = CallSignature {
        arguments: vec![
            type_name.clone(),
            type_name.clone(),
            type_name.clone(),
            type_name,
        ],
        returns: vec![],
        num_ciphertexts: vec![],
    };

    assert_eq!(expected_signature, fhe_program_with_args.signature());

    let context = fhe_program_with_args.build(&get_params()).unwrap();

    assert_eq!(context.graph.node_count(), 4);
}

#[test]
fn can_add() {
    #[fhe_program(scheme = "bfv")]
    fn fhe_program_with_args(a: Cipher<Signed>, b: Cipher<Signed>, c: Cipher<Signed>) {
        let _ = a + b + c;
    }

    let type_name = Cipher::<Signed>::type_name();

    let expected_signature = CallSignature {
        arguments: vec![type_name.clone(), type_name.clone(), type_name],
        returns: vec![],
        num_ciphertexts: vec![],
    };
    assert_eq!(fhe_program_with_args.signature(), expected_signature);
    assert_eq!(fhe_program_with_args.scheme_type(), SchemeType::Bfv);

    let context = fhe_program_with_args.build(&get_params()).unwrap();

    let expected = json!({
        "graph": {
            "nodes": [
                { "operation": "InputCiphertext" },
                { "operation": "InputCiphertext" },
                { "operation": "InputCiphertext" },
                { "operation": "Add" },
                { "operation": "Add" }
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
    });

    assert_eq!(
        context,
        serde_json::from_value::<FheFrontendCompilation>(expected).unwrap()
    );
}

#[test]
fn can_add_plaintext() {
    #[fhe_program(scheme = "bfv")]
    fn fhe_program_with_args(a: Cipher<Signed>, b: Signed) {
        let _ = a + b;
    }

    let expected_signature = CallSignature {
        arguments: vec![Cipher::<Signed>::type_name(), Signed::type_name()],
        returns: vec![],
        num_ciphertexts: vec![],
    };
    assert_eq!(fhe_program_with_args.signature(), expected_signature);
    assert_eq!(fhe_program_with_args.scheme_type(), SchemeType::Bfv);

    let context = fhe_program_with_args.build(&get_params()).unwrap();

    let expected = json!({
        "graph": {
            "nodes": [
                { "operation": "InputCiphertext" },
                { "operation": "InputPlaintext" },
                { "operation": "AddPlaintext" },
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
            ]
        }
    });

    assert_eq!(
        context,
        serde_json::from_value::<FheFrontendCompilation>(expected).unwrap()
    );
}

#[test]
fn can_mul() {
    #[fhe_program(scheme = "bfv")]
    fn fhe_program_with_args(a: Cipher<Signed>, b: Cipher<Signed>, c: Cipher<Signed>) {
        let _ = a * b * c;
    }

    let type_name = Cipher::<Signed>::type_name();

    let expected_signature = CallSignature {
        arguments: vec![type_name.clone(), type_name.clone(), type_name],
        returns: vec![],
        num_ciphertexts: vec![],
    };
    assert_eq!(fhe_program_with_args.signature(), expected_signature);
    assert_eq!(fhe_program_with_args.scheme_type(), SchemeType::Bfv);

    let context = fhe_program_with_args.build(&get_params()).unwrap();

    let expected = json!({
        "graph": {
            "nodes": [
                { "operation": "InputCiphertext" },
                { "operation": "InputCiphertext" },
                { "operation": "InputCiphertext" },
                { "operation": "Multiply" },
                { "operation": "Multiply" }
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

    assert_eq!(
        context,
        serde_json::from_value::<FheFrontendCompilation>(expected).unwrap()
    );
}

#[test]
fn can_collect_output() {
    #[fhe_program(scheme = "bfv")]
    fn fhe_program_with_args(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
        a + b * a
    }

    let type_name = Cipher::<Signed>::type_name();

    let expected_signature = CallSignature {
        arguments: vec![type_name.clone(), type_name.clone()],
        returns: vec![type_name],
        num_ciphertexts: vec![1],
    };
    assert_eq!(fhe_program_with_args.signature(), expected_signature);
    assert_eq!(fhe_program_with_args.scheme_type(), SchemeType::Bfv);

    let context = fhe_program_with_args.build(&get_params()).unwrap();

    let expected = json!({
        "graph": {
            "nodes": [
                { "operation": "InputCiphertext" },
                { "operation": "InputCiphertext" },
                { "operation": "Multiply" },
                { "operation": "Add" },
                { "operation": "Output" },
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
        }
    });

    dbg!(serde_json::to_string(&context).unwrap());

    assert_eq!(
        context,
        serde_json::from_value::<FheFrontendCompilation>(expected).unwrap()
    );
}

#[test]
fn can_collect_multiple_outputs() {
    #[fhe_program(scheme = "bfv")]
    fn fhe_program_with_args(
        a: Cipher<Signed>,
        b: Cipher<Signed>,
    ) -> (Cipher<Signed>, Cipher<Signed>) {
        (a + b * a, a)
    }

    let type_name = Cipher::<Signed>::type_name();

    let expected_signature = CallSignature {
        arguments: vec![type_name.clone(), type_name.clone()],
        returns: vec![type_name.clone(), type_name],
        num_ciphertexts: vec![1, 1],
    };
    assert_eq!(fhe_program_with_args.signature(), expected_signature);
    assert_eq!(fhe_program_with_args.scheme_type(), SchemeType::Bfv);

    let context = fhe_program_with_args.build(&get_params()).unwrap();

    let expected = json!({
        "graph": {
            "nodes": [
            { "operation": "InputCiphertext" },
            { "operation": "InputCiphertext"    },
            { "operation": "Multiply" },
            { "operation": "Add" },
            { "operation": "Output" },
            { "operation": "Output" },
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
        }
    });

    assert_eq!(
        context,
        serde_json::from_value::<FheFrontendCompilation>(expected).unwrap()
    );
}
