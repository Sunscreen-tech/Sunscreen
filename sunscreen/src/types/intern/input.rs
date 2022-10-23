pub use crate::{
    types::{intern::FheProgramNode, Cipher, FheType, NumCiphertexts, TypeName},
    with_ctx,
};

/**
 * Create an input node from an Fhe Program input argument.
 */
pub trait Input {
    /**
     * The type returned by the input fn`.
     */
    type Output;

    /**
     * Creates a new FheProgramNode denoted as an input to an Fhe Program graph.
     *
     * You should not call this, but rather allow the [`fhe_program`](crate::fhe_program) macro to do this on your behalf.
     *
     * # Undefined behavior
     * This type references memory in a backing [`crate::Context`] and without carefully ensuring FheProgramNodes
     * never outlive the backing context, use-after-free can occur.
     *
     */
    fn input() -> Self::Output;
}

impl<T> Input for FheProgramNode<T>
where
    T: NumCiphertexts + TypeName,
{
    type Output = Self;

    fn input() -> Self {
        let mut ids = Vec::with_capacity(T::NUM_CIPHERTEXTS);

        for _ in 0..T::NUM_CIPHERTEXTS {
            if T::type_name().is_encrypted {
                ids.push(with_ctx(|ctx| ctx.add_ciphertext_input()));
            } else {
                ids.push(with_ctx(|ctx| ctx.add_plaintext_input()));
            }
        }

        FheProgramNode::new(&ids)
    }
}

impl<T, const N: usize> Input for [T; N]
where
    T: NumCiphertexts + TypeName + Input + Copy,
{
    type Output = [T::Output; N];

    fn input() -> Self::Output {
        let mut output = Vec::with_capacity(N);

        for _ in 0..N {
            output.push(T::input());
        }

        match output.try_into() {
            Ok(val) => val,
            Err(_) => panic!("Internal error: vec to array length mismatch"),
        }
    }
}

#[test]
fn can_create_inputs() {
    use crate::{
        types::{bfv::Rational, intern::FheProgramNode},
        Context, Operation, Params, SchemeType, SecurityLevel, CURRENT_CTX,
    };
    use std::cell::RefCell;
    use std::mem::transmute;

    use petgraph::stable_graph::NodeIndex;

    CURRENT_CTX.with(|ctx| {
        let mut context = Context::new(&Params {
            lattice_dimension: 0,
            coeff_modulus: vec![],
            plain_modulus: 0,
            scheme_type: SchemeType::Bfv,
            security_level: SecurityLevel::TC128,
        });

        ctx.swap(&RefCell::new(Some(unsafe { transmute(&mut context) })));

        let scalar_node: FheProgramNode<Rational> = FheProgramNode::input();
        let mut offset = 0;

        assert_eq!(scalar_node.ids.len(), 2);
        assert_eq!(scalar_node.ids[0].index(), offset);
        assert_eq!(scalar_node.ids[1].index(), offset + 1);

        offset += 2;

        let array_node: [FheProgramNode<Rational>; 6] = <[FheProgramNode<Rational>; 6]>::input();

        assert_eq!(array_node.len(), 6);

        for i in 0..6 {
            assert_eq!(array_node[i].ids.len(), 2);
            assert_eq!(array_node[i].ids[0].index(), offset + 2 * i);
            assert_eq!(array_node[i].ids[1].index(), offset + 2 * i + 1);
        }

        let multi_dim_array_node: [[FheProgramNode<Cipher<Rational>>; 6]; 6] =
            <[[FheProgramNode<Cipher<Rational>>; 6]; 6]>::input();

        offset += 12;

        for i in 0..6 {
            for j in 0..6 {
                assert_eq!(multi_dim_array_node[i][j].ids.len(), 2);
                assert_eq!(
                    multi_dim_array_node[i][j].ids[0].index(),
                    offset + 6 * 2 * i + 2 * j
                );
                assert_eq!(
                    multi_dim_array_node[i][j].ids[1].index(),
                    offset + 6 * 2 * i + 2 * j + 1
                );
            }
        }

        offset += 2 * 6 * 6;

        assert_eq!(context.compilation.graph.node_count(), offset);

        for i in 0..2 {
            assert_eq!(
                context.compilation.graph[NodeIndex::from(i)],
                Operation::InputPlaintext
            );
        }

        for i in 2..14 {
            assert_eq!(
                context.compilation.graph[NodeIndex::from(i)],
                Operation::InputPlaintext
            );
        }

        for i in 14..context.compilation.graph.node_count() {
            assert_eq!(
                context.compilation.graph[NodeIndex::from(i as u32)],
                Operation::InputCiphertext
            );
        }
    });
}
