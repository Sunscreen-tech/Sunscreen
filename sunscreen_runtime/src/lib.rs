#![warn(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains the types and functions for executing a Sunscreen circuit
//! (i.e. an [`Circuit`](sunscreen_circuit::Circuit)).

mod error;

pub use crate::error::*;
use sunscreen_circuit::{EdgeInfo, Circuit, Literal, Operation::*, OuterLiteral};

use crossbeam::atomic::AtomicCell;
use petgraph::{stable_graph::NodeIndex, visit::EdgeRef, Direction};
use seal::{Ciphertext, Evaluator, GaloisKeys, RelinearizationKeys};

use std::borrow::Cow;
use std::sync::atomic::{AtomicUsize, Ordering};

/**
 * Gets the two input operands and returns a tuple of left, right. For some operations
 * (i.e. subtraction), order matters. While it's erroneous for a binary operations to have
 * anything other than a single left and single right operand, having more operands will result
 * in one being selected arbitrarily. Validating the [`Circuit`] will
 * reveal having the wrong number of operands.
 *
 * # Panics
 * Panics if the given node doesn't have at least one left and one right operand. Calling
 * [`validate()`](sunscreen_circuit::Circuit::validate()) should reveal this
 * issue.
 */
pub fn get_left_right_operands(
    ir: &Circuit,
    index: NodeIndex,
) -> (NodeIndex, NodeIndex) {
    let left = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::LeftOperand)
        .map(|e| e.source())
        .nth(0)
        .unwrap();

    let right = ir
        .graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::RightOperand)
        .map(|e| e.source())
        .nth(0)
        .unwrap();

    (left, right)
}

/**
 * Gets the single unary input operand for the given node. If the [`Circuit`]
 * is malformed and the node has more than one UnaryOperand, one will be selected arbitrarily.
 * As such, one should validate the [`Circuit`] before calling this method.
 *
 * # Panics
 * Panics if the given node doesn't have at least one unary operant. Calling
 * [`validate()`](sunscreen_circuit::Circuit::validate()) should reveal this
 * issue.
 */
pub fn get_unary_operand(ir: &Circuit, index: NodeIndex) -> NodeIndex {
    ir.graph
        .edges_directed(index, Direction::Incoming)
        .filter(|e| *e.weight() == EdgeInfo::UnaryOperand)
        .map(|e| e.source())
        .nth(0)
        .unwrap()
}

/**
 * Validates and runs the given circuit. Unless you can guarantee your circuit is valid,
 * you should use this method rather than [`run_program_unchecked`].
 */
pub fn validate_and_run_program<E: Evaluator + Sync + Send>(
    ir: &Circuit,
    inputs: &[Ciphertext],
    evaluator: &E,
    relin_keys: Option<RelinearizationKeys>,
    galois_keys: Option<GaloisKeys>,
) -> Result<Vec<Ciphertext>> {
    ir.validate()?;

    Ok(unsafe { run_program_unchecked(ir, inputs, evaluator, relin_keys, galois_keys) })
}

/**
 * Run the given [`Circuit`] to completion with the given inputs. This
 * method performs no validation. You must verify the program is first valid. Programs produced
 * by the compiler are guaranteed to be valid, but deserialization does not make any such
 * guarantees. Call [`validate()`](sunscreen_circuit::Circuit::validate()) to verify a program's correctness.
 *
 * # Panics
 * Calling this method on a malformed [`Circuit`] may
 * result in a panic.
 *
 * # Non-termination
 * Calling this method on a malformed [`Circuit`] may
 * result in non-termination.
 *
 * # Undefined behavior
 * Calling this method on a malformed [`Circuit`] may
 * result in undefined behavior.
 */
pub unsafe fn run_program_unchecked<E: Evaluator + Sync + Send>(
    ir: &Circuit,
    inputs: &[Ciphertext],
    evaluator: &E,
    relin_keys: Option<RelinearizationKeys>,
    galois_keys: Option<GaloisKeys>
) -> Vec<Ciphertext> {
    fn get_ciphertext<'a>(
        data: &'a [AtomicCell<Option<Cow<Ciphertext>>>],
        index: usize,
    ) -> &'a Cow<'a, Ciphertext> {
        // This is correct so long as the IR program is indeed a DAG executed in topological order
        // Since for a given edge (x,y), x executes before y, the operand data that y needs
        // from x will exist.
        let val = unsafe { data[index].as_ptr().as_ref().unwrap() };

        let val = match val {
            Some(v) => v,
            None => panic!("Internal error: No ciphertext found for node {}", index),
        };

        val
    }

    let mut data: Vec<AtomicCell<Option<Cow<Ciphertext>>>> =
        Vec::with_capacity(ir.graph.node_count());

    for _ in 0..ir.graph.node_count() {
        data.push(AtomicCell::new(None));
    }

    parallel_traverse(
        ir,
        |index| {
            let node = &ir.graph[index];

            match &node.operation {
                InputCiphertext(id) => {
                    data[index.index()].store(Some(Cow::Borrowed(&inputs[*id])));
                    // moo
                }
                ShiftLeft => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index());
                    let b = match ir.graph[right].operation {
                        Literal(OuterLiteral::Scalar(Literal::U64(v))) => v as i32,
                        _ => panic!("Illegal right operand for ShiftLeft: {:#?}", ir.graph[right].operation)
                    };


                    let c = evaluator.rotate_rows(a, b, galois_keys.as_ref().unwrap()).unwrap();

                    data[index.index()].store(Some(Cow::Owned(c)));
                },
                ShiftRight => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index());
                    let b = match ir.graph[right].operation {
                        Literal(OuterLiteral::Scalar(Literal::U64(v))) => v as i32,
                        _ => panic!("Illegal right operand for ShiftLeft: {:#?}", ir.graph[right].operation)
                    };


                    let c = evaluator.rotate_rows(a, -b, galois_keys.as_ref().unwrap()).unwrap();

                    data[index.index()].store(Some(Cow::Owned(c)));
                },
                Add => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index());
                    let b = get_ciphertext(&data, right.index());

                    let c = evaluator.add(&a, &b).unwrap();

                    data[index.index()].store(Some(Cow::Owned(c)));
                }
                Multiply => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index());
                    let b = get_ciphertext(&data, right.index());

                    let c = evaluator.multiply(&a, &b).unwrap();

                    data[index.index()].store(Some(Cow::Owned(c)));
                }
                SwapRows => unimplemented!(),
                Relinearize => {
                    let relin_keys = relin_keys.as_ref().expect(
                        "Fatal error: attempted to relinearize without relinearization keys.",
                    );

                    let input = get_unary_operand(ir, index);

                    let a = get_ciphertext(&data, input.index());

                    let c = evaluator.relinearize(&a, relin_keys).unwrap();

                    data[index.index()].store(Some(Cow::Owned(c)));
                }
                Negate => unimplemented!(),
                Sub => unimplemented!(),
                Literal(_x) => { },
                OutputCiphertext => {
                    let input = get_unary_operand(ir, index);

                    let a = get_ciphertext(&data, input.index());

                    data[index.index()].store(Some(Cow::Borrowed(&a)));
                }
            };
        },
        None,
    );

    // Copy ciphertexts to output vector
    ir.graph
        .node_indices()
        .filter_map(|id| match ir.graph[id].operation {
            OutputCiphertext => Some(get_ciphertext(&data, id.index()).clone().into_owned()),
            _ => None,
        })
        .collect()
}

/**
 * Traverses the graph in the given
 */
fn parallel_traverse<F>(ir: &Circuit, callback: F, run_to: Option<NodeIndex>)
where
    F: Fn(NodeIndex) -> () + Sync + Send,
{
    let ir = if let Some(x) = run_to {
        Cow::Owned(ir.prune(&vec![x])) // MOO
    } else {
        Cow::Borrowed(ir) // moo
    };

    // Initialize the number of incomplete dependencies.
    let mut deps: Vec<AtomicUsize> = Vec::with_capacity(ir.graph.node_count());

    for n in ir.graph.node_indices() {
        unsafe {
            *deps.get_unchecked_mut(n.index()) =
                AtomicUsize::new(ir.graph.neighbors_directed(n, Direction::Incoming).count());
        }
    }

    unsafe { deps.set_len(ir.graph.node_count()) };

    let mut threadpool = scoped_threadpool::Pool::new(num_cpus::get() as u32);
    let items_remaining = AtomicUsize::new(ir.graph.node_count());

    let (sender, reciever) = crossbeam::channel::unbounded();

    for r in deps
        .iter()
        .filter(|count| count.load(Ordering::Relaxed) == 0)
        .enumerate()
        .map(|(id, _)| id)
    {
        sender.send(r).unwrap();
    }

    threadpool.scoped(|scope| {
        for _ in 0..num_cpus::get() {
            scope.execute(|| {
                loop {
                    let mut updated_count = false;

                    // Atomically check if the number of items remaining is zero. If it is,
                    // there's no more work to do, so return. Otherwise, decrement the count
                    // and this thread will take an item.
                    while !updated_count {
                        let count = items_remaining.load(Ordering::Acquire);

                        if count == 0 {
                            return;
                        }

                        match items_remaining.compare_exchange_weak(
                            count,
                            count - 1,
                            Ordering::Release,
                            Ordering::Relaxed,
                        ) {
                            Ok(_) => {
                                updated_count = true;
                            }
                            _ => {}
                        }
                    }

                    let node_id = NodeIndex::from(reciever.recv().unwrap() as u32);

                    callback(node_id);

                    // Check each child's dependency count and mark it as ready if 0.
                    for e in ir.graph.neighbors_directed(node_id, Direction::Outgoing) {
                        let old_val = deps[e.index()].fetch_sub(1, Ordering::Relaxed);

                        // Note is the value prior to atomic subtraction.
                        if old_val == 1 {
                            sender.send(e.index()).unwrap();
                        }
                    }
                }
            });
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use seal::*;

    fn setup_scheme(
        degree: u64,
    ) -> (
        KeyGenerator,
        Context,
        PublicKey,
        SecretKey,
        Encryptor,
        Decryptor,
        BFVEvaluator,
    ) {
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(degree)
            .set_plain_modulus(PlainModulus::batching(degree, 17).unwrap())
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(degree, SecurityLevel::default()).unwrap(),
            )
            .build()
            .unwrap();

        let context = Context::new(&params, true, SecurityLevel::default()).unwrap();

        let keygen = KeyGenerator::new(&context).unwrap();
        let public_key = keygen.create_public_key();
        let secret_key = keygen.secret_key();

        let encryptor =
            Encryptor::with_public_and_secret_key(&context, &public_key, &secret_key).unwrap();
        let decryptor = Decryptor::new(&context, &secret_key).unwrap();

        let evaluator = BFVEvaluator::new(&context).unwrap();

        (
            keygen, context, public_key, secret_key, encryptor, decryptor, evaluator,
        )
    }

    #[test]
    fn simple_add() {
        let mut ir = Circuit::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        let c = ir.append_add(a, b);
        ir.append_output_ciphertext(c);

        let degree = 8192;

        let (_keygen, context, _public_key, _secret_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();

        let a = vec![42; degree as usize];
        let b = vec![-24; degree as usize];

        let pt_0 = encoder.encode_signed(&a).unwrap();
        let pt_1 = encoder.encode_signed(&b).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();
        let ct_1 = encryptor.encrypt(&pt_1).unwrap();

        let output = unsafe { run_program_unchecked(&ir, &[ct_0, ct_1], &evaluator, None, None) };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        assert_eq!(
            encoder.decode_signed(&o_p).unwrap(),
            vec![42 - 24; degree as usize]
        );
    }

    #[test]
    fn simple_mul() {
        let mut ir = Circuit::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        let c = ir.append_multiply(a, b);
        ir.append_output_ciphertext(c);

        let degree = 8192;

        let (keygen, context, _public_key, _secret_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let relin_keys = keygen.create_relinearization_keys().unwrap();

        let a = vec![42; degree as usize];
        let b = vec![-24; degree as usize];

        let pt_0 = encoder.encode_signed(&a).unwrap();
        let pt_1 = encoder.encode_signed(&b).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();
        let ct_1 = encryptor.encrypt(&pt_1).unwrap();

        let output =
            unsafe { run_program_unchecked(&ir, &[ct_0, ct_1], &evaluator, Some(relin_keys), None) };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        assert_eq!(
            encoder.decode_signed(&o_p).unwrap(),
            vec![42 * -24; degree as usize]
        );
    }

    #[test]
    fn can_mul_and_relinearize() {
        let mut ir = Circuit::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        let c = ir.append_multiply(a, b);
        let d = ir.append_relinearize(c);
        ir.append_output_ciphertext(d);

        let degree = 8192;

        let (keygen, context, _public_key, _secret_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let relin_keys = keygen.create_relinearization_keys().unwrap();

        let a = vec![42; degree as usize];
        let b = vec![-24; degree as usize];

        let pt_0 = encoder.encode_signed(&a).unwrap();
        let pt_1 = encoder.encode_signed(&b).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();
        let ct_1 = encryptor.encrypt(&pt_1).unwrap();

        let output =
            unsafe { run_program_unchecked(&ir, &[ct_0, ct_1], &evaluator, Some(relin_keys), None) };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        assert_eq!(
            encoder.decode_signed(&o_p).unwrap(),
            vec![42 * -24; degree as usize]
        );
    }

    #[test]
    fn add_reduction() {
        let mut ir = Circuit::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        let c = ir.append_input_ciphertext(0);
        let d = ir.append_input_ciphertext(1);
        let e = ir.append_input_ciphertext(0);
        let f = ir.append_input_ciphertext(1);
        let g = ir.append_input_ciphertext(0);
        let h = ir.append_input_ciphertext(1);

        let a_0 = ir.append_add(a, b);
        let a_1 = ir.append_add(c, d);
        let a_2 = ir.append_add(e, f);
        let a_3 = ir.append_add(g, h);

        let a_0_0 = ir.append_add(a_0, a_1);
        let a_1_0 = ir.append_add(a_2, a_3);

        let res = ir.append_add(a_0_0, a_1_0);

        ir.append_output_ciphertext(res);

        let degree = 8192;

        let (keygen, context, _public_key, _secret_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let relin_keys = keygen.create_relinearization_keys().unwrap();

        let a = vec![42; degree as usize];
        let b = vec![-24; degree as usize];

        let pt_0 = encoder.encode_signed(&a).unwrap();
        let pt_1 = encoder.encode_signed(&b).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();
        let ct_1 = encryptor.encrypt(&pt_1).unwrap();

        let output =
            unsafe { run_program_unchecked(&ir, &[ct_0, ct_1], &evaluator, Some(relin_keys), None) };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        assert_eq!(
            encoder.decode_signed(&o_p).unwrap(),
            vec![4 * (42 - 24); degree as usize]
        );
    }

    #[test]
    fn rotate_left() {
        let mut ir = Circuit::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let l = ir.append_input_literal(OuterLiteral::Scalar(Literal::U64(3)));

        let res = ir.append_rotate_left(a, l);

        ir.append_output_ciphertext(res);

        let degree = 4096;

        let (keygen, context, _public_key, _secret_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let galois_keys = keygen.create_galois_keys().unwrap();

        let a: Vec<u64> = (0..degree).into_iter().collect();

        let pt_0 = encoder.encode_unsigned(&a).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();

        let output =
            unsafe { run_program_unchecked(&ir, &[ct_0], &evaluator, None, Some(galois_keys)) };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        let mut expected = (3..degree / 2)
            .into_iter()
            .collect::<Vec<u64>>();
            
        expected.append(&mut vec![0, 1, 2]);

        expected.append(
            &mut (degree / 2 + 3..degree)
            .into_iter()
            .collect::<Vec<u64>>()
        );

        expected.append(&mut vec![degree / 2, degree / 2 + 1, degree / 2+ 2]);

        assert_eq!(
            encoder.decode_unsigned(&o_p).unwrap(),
            expected
        );
    }

    #[test]
    fn rotate_right() {
        let mut ir = Circuit::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let l = ir.append_input_literal(OuterLiteral::Scalar(Literal::U64(3)));

        let res = ir.append_rotate_right(a, l);

        ir.append_output_ciphertext(res);

        let degree = 4096;

        let (keygen, context, _public_key, _secret_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let galois_keys = keygen.create_galois_keys().unwrap();

        let a: Vec<u64> = (0..degree).into_iter().collect();

        let pt_0 = encoder.encode_unsigned(&a).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();

        let output =
            unsafe { run_program_unchecked(&ir, &[ct_0], &evaluator, None, Some(galois_keys)) };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        let mut expected = vec![degree / 2 - 3, degree / 2 - 2, degree / 2 - 1];
    
        expected.append(&mut (0..degree / 2 - 3)
            .into_iter()
            .collect::<Vec<u64>>()
        );

        expected.append(&mut vec![degree - 3, degree - 2, degree - 1]);

        expected.append(
            &mut (degree / 2..degree - 3)
            .into_iter()
            .collect::<Vec<u64>>()
        );

        assert_eq!(
            encoder.decode_unsigned(&o_p).unwrap(),
            expected
        );
    }
}
