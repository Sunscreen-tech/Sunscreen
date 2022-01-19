use sunscreen_compiler::{
    types::{TypeName, Cipher, Unsigned},
    CallSignature, FrontendCompilation, Params, SchemeType, SecurityLevel, CURRENT_CTX, CircuitFn
};
use sunscreen_compiler_macros::circuit;

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

type CipherUnsigned = Cipher<Unsigned>;
/*
#[test]
fn circuit_gets_called() {
    static mut FOO: u32 = 0;

    #[circuit(scheme = "bfv")]
    fn simple_circuit() {
        unsafe {
            FOO = 20;
        };
    }

    let expected_signature = CallSignature {
        arguments: vec![],
        returns: vec![],
        num_ciphertexts: vec![],
    };

    assert_eq!(simple_circuit.signature(), expected_signature);
    assert_eq!(simple_circuit.scheme_type(), SchemeType::Bfv);

    let _context = simple_circuit.build(&get_params()).unwrap();

    assert_eq!(unsafe { FOO }, 20);
}

#[test]
fn panicing_circuit_clears_ctx() {
    #[circuit(scheme = "bfv")]
    fn panic_circuit() {
        CURRENT_CTX.with(|ctx| {
            let old = ctx.take();

            assert_eq!(old.is_some(), true);
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

        assert_eq!(panic_circuit.signature(), expected_signature);
        assert_eq!(panic_circuit.scheme_type(), SchemeType::Bfv);

        let _context = panic_circuit.build(&get_params()).unwrap();
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
    #[circuit(scheme = "bfv")]
    fn circuit_with_args(_a: Unsigned, _b: Unsigned, _c: Unsigned, _d: Unsigned) {}

    assert_eq!(circuit_with_args.scheme_type(), SchemeType::Bfv);

    let type_name = Unsigned::type_name();

    let expected_signature = CallSignature {
        arguments: vec![
            type_name.clone(),
            type_name.clone(),
            type_name.clone(),
            type_name.clone(),
        ],
        returns: vec![],
        num_ciphertexts: vec![],
    };

    assert_eq!(expected_signature, circuit_with_args.signature());

    let context = circuit_with_args.build(&get_params()).unwrap();

    assert_eq!(context.graph.node_count(), 4);
}

#[test]
fn can_add() {
    #[circuit(scheme = "bfv")]
    fn circuit_with_args(a: CipherUnsigned, b: CipherUnsigned, c: CipherUnsigned) {
        let _ = a + b + c;
    }

    let type_name = Unsigned::type_name();

    let expected_signature = CallSignature {
        arguments: vec![type_name.clone(), type_name.clone(), type_name.clone()],
        returns: vec![],
        num_ciphertexts: vec![],
    };
    assert_eq!(circuit_with_args.signature(), expected_signature);
    assert_eq!(circuit_with_args.scheme_type(), SchemeType::Bfv);

    let context: FrontendCompilation = circuit_with_args.build(&get_params()).unwrap();

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
    });

    assert_eq!(
        context,
        serde_json::from_value::<FrontendCompilation>(expected).unwrap()
    );
}

#[test]
fn can_mul() {
    #[circuit(scheme = "bfv")]
    fn circuit_with_args(a: CipherUnsigned, b: CipherUnsigned, c: CipherUnsigned) {
        let _ = a * b * c;
    }

    let type_name = Unsigned::type_name();

    let expected_signature = CallSignature {
        arguments: vec![type_name.clone(), type_name.clone(), type_name.clone()],
        returns: vec![],
        num_ciphertexts: vec![],
    };
    assert_eq!(circuit_with_args.signature(), expected_signature);
    assert_eq!(circuit_with_args.scheme_type(), SchemeType::Bfv);

    let context = circuit_with_args.build(&get_params()).unwrap();

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
    });

    assert_eq!(
        context,
        serde_json::from_value::<FrontendCompilation>(expected).unwrap()
    );
}

#[test]
fn can_collect_output() {
    #[circuit(scheme = "bfv")]
    fn circuit_with_args(a: Cipher<Unsigned>, b: CipherUnsigned) -> CipherUnsigned {
        a + b * a
    }

    let type_name = Unsigned::type_name();

    let expected_signature = CallSignature {
        arguments: vec![type_name.clone(), type_name.clone()],
        returns: vec![type_name.clone()],
        num_ciphertexts: vec![1],
    };
    assert_eq!(circuit_with_args.signature(), expected_signature);
    assert_eq!(circuit_with_args.scheme_type(), SchemeType::Bfv);

    let context = circuit_with_args.build(&get_params()).unwrap();

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
    });

    assert_eq!(
        context,
        serde_json::from_value::<FrontendCompilation>(expected).unwrap()
    );
}

*/

#[test]
fn can_collect_multiple_outputs() {
    #[circuit(scheme = "bfv")]
    fn circuit_with_args(a: Cipher<Unsigned>, b: CipherUnsigned) -> (CipherUnsigned, CipherUnsigned) {
        (a + b * a, a)
    }

    let type_name = Unsigned::type_name();

    let expected_signature = CallSignature {
        arguments: vec![type_name.clone(), type_name.clone()],
        returns: vec![type_name.clone(), type_name.clone()],
        num_ciphertexts: vec![1, 1],
    };
    assert_eq!(circuit_with_args.signature(), expected_signature);
    assert_eq!(circuit_with_args.scheme_type(), SchemeType::Bfv);

    let context = circuit_with_args.build(&get_params()).unwrap();

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
    });

    assert_eq!(
        context,
        serde_json::from_value::<FrontendCompilation>(expected).unwrap()
    );
}

#[allow(non_camel_case_types)] struct circuit_with_args_struct { } impl
            sunscreen_compiler :: CircuitFn for circuit_with_args_struct
            {
                fn build(& self, params : & Params) -> sunscreen_compiler :: Result <
                sunscreen_compiler :: FrontendCompilation >
                {
                    use std :: cell :: RefCell ; use std :: mem :: transmute ; use
                    sunscreen_compiler ::
                    {
                        CURRENT_CTX, Context, Error, INDEX_ARENA, Result, Params,
                        SchemeType, Value, types ::
                        { CircuitNode, NumCiphertexts, Type, TypeName, TypeNameInstance }
                    } ; if SchemeType :: Bfv != params.scheme_type
                    { return Err(Error :: IncorrectScheme) } let mut context = Context ::
                    new(params) ;
                    CURRENT_CTX.with(| ctx |
                                     {
                                         let internal = | a : CircuitNode < Cipher <
                                         Unsigned > >, b : CircuitNode < CipherUnsigned >,
                                         | ->
                                         (sunscreen_compiler :: types :: CircuitNode <
                                          CipherUnsigned >, sunscreen_compiler :: types ::
                                          CircuitNode < CipherUnsigned >,)
                                         { { (a + b * a, a) } } ;
                                         ctx.swap(& RefCell ::
                                                  new(Some(unsafe
                                                           { transmute(& mut context) })))
                                         ; let c_0 : CircuitNode < Cipher < Unsigned > > =
                                         CircuitNode :: input() ; let c_1 : CircuitNode <
                                         CipherUnsigned > = CircuitNode :: input() ; let
                                         panic_res = std :: panic ::
                                         catch_unwind(|| { internal(c_0, c_1) }) ; match
                                         panic_res
                                         {
                                             Ok(v) => { v.0.output() ; v.1.output() ; },
                                             Err(err) =>
                                             {
                                                 INDEX_ARENA.with(| allocator |
                                                                  {
                                                                      unsafe
                                                                      {
                                                                          allocator.borrow_mut().reset()
                                                                      }
                                                                  }) ;
                                                 ctx.swap(& RefCell :: new(None)) ; std ::
                                                 panic :: resume_unwind(err)
                                             }
                                         } ;
                                         INDEX_ARENA.with(| allocator |
                                                          {
                                                              unsafe
                                                              {
                                                                  allocator.borrow_mut().reset()
                                                              }
                                                          }) ;
                                         ctx.swap(& RefCell :: new(None)) ;
                                     }) ; Ok(context.compilation)
                } fn signature(& self) -> sunscreen_compiler :: CallSignature
                {
                    use sunscreen_compiler :: types :: NumCiphertexts ; type T0 = Cipher <
                    Unsigned > ; type T1 = CipherUnsigned ; sunscreen_compiler ::
                    CallSignature
                    {
                        arguments : vec! [T0 :: type_name(), T1 :: type_name(),], returns
                        : vec!
                        [CipherUnsigned :: type_name(), CipherUnsigned :: type_name(),],
                        num_ciphertexts : vec!
                        [CipherUnsigned :: NUM_CIPHERTEXTS, CipherUnsigned ::
                         NUM_CIPHERTEXTS,],
                    }
                } fn scheme_type(& self) -> sunscreen_compiler :: SchemeType
                { SchemeType :: Bfv }
            } #[allow(non_upper_case_globals)] const circuit_with_args :
            circuit_with_args_struct = circuit_with_args_struct { } ;