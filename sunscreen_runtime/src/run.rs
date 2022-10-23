use crate::{InnerPlaintext, SealData};
use sunscreen_fhe_program::{traversal::*, FheProgram, Literal, Operation::*};

use crossbeam::atomic::AtomicCell;
use petgraph::{stable_graph::NodeIndex, Direction};

use std::borrow::Cow;
#[cfg(target_arch = "wasm32")]
use std::collections::VecDeque;
#[cfg(not(target_arch = "wasm32"))]
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use seal_fhe::{
    Ciphertext, Error as SealError, Evaluator, GaloisKeys, Plaintext, RelinearizationKeys,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/**
 * An error that occurs while running an Fhe Program.
 */
pub enum FheProgramRunFailure {
    /**
     * An error occurred in a SEAL evaluator.
     */
    SealError,

    /**
     * The FHE program needed Galois keys, but none were provided.
     */
    MissingGaloisKeys,

    /**
     * The FHE program needed relin keys, but none were provided.
     */
    MissingRelinearizationKeys,

    /**
     * Running the FHE program caused a panic unwind.
     */
    Panic,

    /**
     * Expected the output of an Fhe Program node to be a ciphertext, but
     * it wasn't.
     */
    ExpectedCiphertext,

    /**
     * Expected the output of an Fhe Program node to be a plaintext, but
     * it wasn't.
     */
    ExpectedPlaintext,

    /**
     * A plaintext literal was malformed.
     */
    MalformedPlaintext,

    /**
     * Internal error: no data found for a parent node.
     */
    MissingData,
}

impl From<SealError> for FheProgramRunFailure {
    fn from(_: SealError) -> Self {
        Self::SealError
    }
}

/**
 * You probably should instead use [`Runtime::run()`](crate::Runtime::run).
 *
 * Run the given [`FheProgram`] to completion with the given inputs. This
 * method performs no validation. You must verify the program is first valid. Programs produced
 * by the compiler are guaranteed to be valid, but deserialization does not make any such
 * guarantees. Call [`validate()`](sunscreen_fhe_program::FheProgram::validate()) to verify a program's correctness.
 *
 * # Remarks
 * The input and outputs of this method are vectors containing [`seal_fhe::Ciphertext`] values, not the
 * high-level [`Ciphertext`] types. You must first unpack them from the high-level types.
 *
 * # Safety
 * Calling this method on a malformed [`FheProgram`] may
 * result in panics, non-termination, or undefined behavior.
 */
pub unsafe fn run_program_unchecked<E: Evaluator + Sync + Send>(
    ir: &FheProgram,
    inputs: &[SealData],
    evaluator: &E,
    relin_keys: &Option<&RelinearizationKeys>,
    galois_keys: &Option<&GaloisKeys>,
) -> Result<Vec<Ciphertext>, FheProgramRunFailure> {
    fn get_data(
        data: &[AtomicCell<Option<Arc<SealData>>>],
        index: usize,
    ) -> Result<&Arc<SealData>, FheProgramRunFailure> {
        let data = data.get(index).ok_or(FheProgramRunFailure::MissingData)?;

        // This is correct so long as the IR program is indeed a DAG executed in topological order
        // Since for a given edge (x,y), x executes before y, the operand data that y needs
        // from x will exist.
        let val = unsafe { data.as_ptr().as_ref().unwrap() };

        match val {
            Some(v) => Ok(v),
            None => Err(FheProgramRunFailure::MissingData),
        }
    }

    fn get_ciphertext(
        data: &[AtomicCell<Option<Arc<SealData>>>],
        index: usize,
    ) -> Result<&Ciphertext, FheProgramRunFailure> {
        let val = get_data(data, index)?.as_ref();

        match val {
            SealData::Ciphertext(ref c) => Ok(c),
            _ => Err(FheProgramRunFailure::ExpectedCiphertext),
        }
    }

    fn get_plaintext(
        data: &[AtomicCell<Option<Arc<SealData>>>],
        index: usize,
    ) -> Result<&Plaintext, FheProgramRunFailure> {
        let val = get_data(data, index)?.as_ref();

        match val {
            SealData::Plaintext(ref c) => Ok(c),
            _ => Err(FheProgramRunFailure::ExpectedPlaintext),
        }
    }

    let mut data: Vec<AtomicCell<Option<Arc<SealData>>>> =
        Vec::with_capacity(ir.graph.node_count());

    let inputs = inputs
        .iter()
        .map(|v| Arc::new(v.clone()))
        .collect::<Vec<Arc<SealData>>>();

    for _ in 0..ir.graph.node_count() {
        data.push(AtomicCell::new(None));
    }

    traverse(
        ir,
        |index| {
            let node = &ir.graph[index];

            match &node.operation {
                InputCiphertext(id) => {
                    data[index.index()].store(Some(inputs[*id].clone()));
                    // moo
                }
                InputPlaintext(id) => {
                    data[index.index()].store(Some(inputs[*id].clone()));
                }
                ShiftLeft => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index())?;
                    let b = match ir.graph[right].operation {
                        Literal(Literal::U64(v)) => v as i32,
                        _ => panic!(
                            "Illegal right operand for ShiftLeft: {:#?}",
                            ir.graph[right].operation
                        ),
                    };

                    let c = evaluator.rotate_rows(
                        a,
                        b,
                        galois_keys
                            .as_ref()
                            .ok_or(FheProgramRunFailure::MissingGaloisKeys)?,
                    )?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                ShiftRight => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index())?;
                    let b = match ir.graph[right].operation {
                        Literal(Literal::U64(v)) => v as i32,
                        _ => panic!(
                            "Illegal right operand for ShiftLeft: {:#?}",
                            ir.graph[right].operation
                        ),
                    };

                    let c = evaluator.rotate_rows(
                        a,
                        -b,
                        galois_keys
                            .as_ref()
                            .ok_or(FheProgramRunFailure::MissingGaloisKeys)?,
                    )?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                Add => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index())?;
                    let b = get_ciphertext(&data, right.index())?;

                    let c = evaluator.add(a, b)?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                AddPlaintext => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index())?;
                    let b = get_plaintext(&data, right.index())?;

                    let c = evaluator.add_plain(a, b)?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                Multiply => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index())?;
                    let b = get_ciphertext(&data, right.index())?;

                    let c = evaluator.multiply(a, b)?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                MultiplyPlaintext => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index())?;
                    let b = get_plaintext(&data, right.index())?;

                    let c = evaluator.multiply_plain(a, b)?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                SwapRows => {
                    let galois_keys = galois_keys
                        .as_ref()
                        .ok_or(FheProgramRunFailure::MissingGaloisKeys)?;

                    let input = get_unary_operand(ir, index);

                    let x = get_ciphertext(&data, input.index())?;

                    let y = evaluator.rotate_columns(x, galois_keys)?;

                    data[index.index()].store(Some(Arc::new(y.into())));
                }
                Relinearize => {
                    let relin_keys = relin_keys
                        .as_ref()
                        .ok_or(FheProgramRunFailure::MissingRelinearizationKeys)?;

                    let input = get_unary_operand(ir, index);

                    let a = get_ciphertext(&data, input.index())?;

                    let c = evaluator.relinearize(a, relin_keys)?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                Negate => {
                    let x_id = get_unary_operand(ir, index);

                    let x = get_ciphertext(&data, x_id.index())?;

                    let y = evaluator.negate(x)?;

                    data[index.index()].store(Some(Arc::new(y.into())));
                }
                Sub => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index())?;
                    let b = get_ciphertext(&data, right.index())?;

                    let c = evaluator.sub(a, b)?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                SubPlaintext => {
                    let (left, right) = get_left_right_operands(ir, index);

                    let a = get_ciphertext(&data, left.index())?;
                    let b = get_plaintext(&data, right.index())?;

                    let c = evaluator.sub_plain(a, b)?;

                    data[index.index()].store(Some(Arc::new(c.into())));
                }
                Literal(x) => {
                    if let Literal::Plaintext(p) = x {
                        let p = InnerPlaintext::from_bytes(p)
                            .map_err(|_| FheProgramRunFailure::MalformedPlaintext)?;

                        match p {
                            InnerPlaintext::Seal(p) => {
                                // Plaintext literals should always have exactly one plaintext.
                                if p.len() != 1 {
                                    return Err(FheProgramRunFailure::MalformedPlaintext);
                                }

                                data[index.index()].store(Some(Arc::new(p[0].data.clone().into())))
                            }
                        };
                    }
                }
                OutputCiphertext => {
                    let input = get_unary_operand(ir, index);

                    let a = get_data(&data, input.index())?;

                    data[index.index()].store(Some(a.clone()));
                }
            };

            Ok(())
        },
        None,
    )?;

    // Attempt to copy ciphertexts to our output vector.
    let output = ir
        .graph
        .node_indices()
        .filter_map(|id| match ir.graph[id].operation {
            OutputCiphertext => Some(get_ciphertext(&data, id.index())),
            _ => None,
        })
        .collect::<Result<Vec<&Ciphertext>, FheProgramRunFailure>>()?
        .drain(0..)
        .map(|c| c.to_owned())
        .collect();

    Ok(output)
}

#[cfg(not(target_arch = "wasm32"))]
/**
 * Traverses the FheProgram's nodes in topological order, executing
 * callback on each node.
 *
 * # Remarks
 * This implementation executes in parallel and cannot mutate the graph
 * during traversal (as indicated by the lack of `mut` on `ir`).
 *
 * The optional `run_to` specifies to only run the given node and
 * its ancestors, topologically. If not specified, every node in the
 * program gets visited.
 */
pub fn traverse<F>(
    ir: &FheProgram,
    callback: F,
    run_to: Option<NodeIndex>,
) -> Result<(), FheProgramRunFailure>
where
    F: Fn(NodeIndex) -> Result<(), FheProgramRunFailure> + Sync + Send,
{
    let ir = if let Some(x) = run_to {
        Cow::Owned(ir.prune(&[x])) // MOO
    } else {
        Cow::Borrowed(ir) // moo
    };

    let ir = ir.as_ref();

    // Initialize the number of incomplete dependencies.
    let deps = ir
        .graph
        .node_indices()
        .map(|n| AtomicUsize::new(ir.graph.neighbors_directed(n, Direction::Incoming).count()))
        .collect::<Vec<AtomicUsize>>();

    let items_remaining = AtomicUsize::new(ir.graph.node_count());

    // We must eagerly evaluate the iterator (i.e. collect) since
    // the dependency counts will be changing during iteration. Lazy
    // iteration causes a race condition between the filter_map closer
    // evaluating and the deps counts being decremented, potentially
    // resulting in nodes being run more than once.
    let initial_ready = deps
        .iter()
        .enumerate()
        .filter_map(|(id, count)| {
            if count.load(Ordering::Relaxed) == 0 {
                log::trace!("parallel_traverse: Initial node {}", id);
                Some(id)
            } else {
                None
            }
        })
        .collect::<Vec<usize>>();

    let returned_result = AtomicCell::new(Ok(()));

    rayon::scope(|s| {
        for node_id in initial_ready {
            fn run_internal<F>(
                node_id: NodeIndex,
                ir: &FheProgram,
                deps: &[AtomicUsize],
                returned_result: &AtomicCell<Result<(), FheProgramRunFailure>>,
                items_remaining: &AtomicUsize,
                callback: &F,
            ) where
                F: Fn(NodeIndex) -> Result<(), FheProgramRunFailure> + Sync + Send,
            {
                log::trace!("parallel_traverse: Running node {}", node_id.index());

                if returned_result.load().is_err() {
                    return;
                }

                let result = callback(node_id);

                if result.is_err() {
                    returned_result.store(result);
                    return;
                }

                rayon::scope(|s| {
                    // Check each child's dependency count and mark it as ready if 0.
                    for e in ir.graph.neighbors_directed(node_id, Direction::Outgoing) {
                        let old_val = deps[e.index()].fetch_sub(1, Ordering::Relaxed);

                        // Note is the value prior to atomic subtraction.
                        if old_val == 1 {
                            s.spawn(move |_| {
                                log::trace!("Node {} ready", e.index());
                                run_internal(
                                    e,
                                    ir,
                                    deps,
                                    returned_result,
                                    items_remaining,
                                    callback,
                                );
                            });
                        }
                    }
                });
            }

            let deps = &deps;
            let returned_result = &returned_result;
            let items_remaining = &items_remaining;
            let callback = &callback;

            s.spawn(move |_| {
                run_internal(
                    NodeIndex::from(node_id as u32),
                    ir,
                    deps,
                    returned_result,
                    items_remaining,
                    callback,
                );
            });
        }
    });

    returned_result.load()
}

#[cfg(target_arch = "wasm32")]
pub fn traverse<F>(
    ir: &FheProgram,
    callback: F,
    run_to: Option<NodeIndex>,
) -> Result<(), FheProgramRunFailure>
where
    F: Fn(NodeIndex) -> Result<(), FheProgramRunFailure> + Sync + Send,
{
    let ir = if let Some(x) = run_to {
        Cow::Owned(ir.prune(&vec![x]))
    } else {
        Cow::Borrowed(ir)
    };

    // Initialize the number of incomplete dependencies.
    let mut deps = ir
        .graph
        .node_indices()
        .map(|n| ir.graph.neighbors_directed(n, Direction::Incoming).count())
        .collect::<Vec<usize>>();

    let initial_ready = deps.iter().enumerate().filter_map(|(id, count)| {
        if *count == 0 {
            log::trace!("traverse: Initial node {}", id);
            Some(NodeIndex::from(id as u32))
        } else {
            None
        }
    });

    let mut ready_nodes = VecDeque::new();

    for i in initial_ready {
        ready_nodes.push_back(i);
    }

    loop {
        let node_id = ready_nodes.pop_front();
        let node_id = match node_id {
            Some(i) => i,
            None => {
                break;
            }
        };

        callback(node_id)?;

        for e in ir.graph.neighbors_directed(node_id, Direction::Outgoing) {
            deps[e.index()] -= 1;

            if deps[e.index()] == 0 {
                ready_nodes.push_back(e);
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use seal_fhe::*;
    use sunscreen_fhe_program::SchemeType;

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
        let private_key = keygen.secret_key();

        let encryptor =
            Encryptor::with_public_and_secret_key(&context, &public_key, &private_key).unwrap();
        let decryptor = Decryptor::new(&context, &private_key).unwrap();

        let evaluator = BFVEvaluator::new(&context).unwrap();

        (
            keygen,
            context,
            public_key,
            private_key,
            encryptor,
            decryptor,
            evaluator,
        )
    }

    #[test]
    fn simple_add() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        let c = ir.append_add(a, b);
        ir.append_output_ciphertext(c);

        let degree = 8192;

        let (_keygen, context, _public_key, _private_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();

        let a = vec![42; degree as usize];
        let b = vec![-24; degree as usize];

        let pt_0 = encoder.encode_signed(&a).unwrap();
        let pt_1 = encoder.encode_signed(&b).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();
        let ct_1 = encryptor.encrypt(&pt_1).unwrap();

        let output = unsafe {
            run_program_unchecked(&ir, &[ct_0.into(), ct_1.into()], &evaluator, &None, &None)
                .unwrap()
        };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        assert_eq!(
            encoder.decode_signed(&o_p).unwrap(),
            vec![42 - 24; degree as usize]
        );
    }

    #[test]
    fn simple_mul() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        let c = ir.append_multiply(a, b);
        ir.append_output_ciphertext(c);

        let degree = 8192;

        let (keygen, context, _public_key, _private_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let relin_keys = keygen.create_relinearization_keys().unwrap();

        let a = vec![42; degree as usize];
        let b = vec![-24; degree as usize];

        let pt_0 = encoder.encode_signed(&a).unwrap();
        let pt_1 = encoder.encode_signed(&b).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();
        let ct_1 = encryptor.encrypt(&pt_1).unwrap();

        let output = unsafe {
            run_program_unchecked(
                &ir,
                &[ct_0.into(), ct_1.into()],
                &evaluator,
                &Some(&relin_keys),
                &None,
            )
            .unwrap()
        };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        assert_eq!(
            encoder.decode_signed(&o_p).unwrap(),
            vec![42 * -24; degree as usize]
        );
    }

    #[test]
    fn can_mul_and_relinearize() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let b = ir.append_input_ciphertext(1);
        let c = ir.append_multiply(a, b);
        let d = ir.append_relinearize(c);
        ir.append_output_ciphertext(d);

        let degree = 8192;

        let (keygen, context, _public_key, _private_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let relin_keys = keygen.create_relinearization_keys().unwrap();

        let a = vec![42; degree as usize];
        let b = vec![-24; degree as usize];

        let pt_0 = encoder.encode_signed(&a).unwrap();
        let pt_1 = encoder.encode_signed(&b).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();
        let ct_1 = encryptor.encrypt(&pt_1).unwrap();

        let output = unsafe {
            run_program_unchecked(
                &ir,
                &[ct_0.into(), ct_1.into()],
                &evaluator,
                &Some(&relin_keys),
                &None,
            )
            .unwrap()
        };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        assert_eq!(
            encoder.decode_signed(&o_p).unwrap(),
            vec![42 * -24; degree as usize]
        );
    }

    #[test]
    fn add_reduction() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

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

        let (keygen, context, _public_key, _private_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let relin_keys = keygen.create_relinearization_keys().unwrap();

        let a = vec![42; degree as usize];
        let b = vec![-24; degree as usize];

        let pt_0 = encoder.encode_signed(&a).unwrap();
        let pt_1 = encoder.encode_signed(&b).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();
        let ct_1 = encryptor.encrypt(&pt_1).unwrap();

        let output = unsafe {
            run_program_unchecked(
                &ir,
                &[ct_0.into(), ct_1.into()],
                &evaluator,
                &Some(&relin_keys),
                &None,
            )
            .unwrap()
        };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        assert_eq!(
            encoder.decode_signed(&o_p).unwrap(),
            vec![4 * (42 - 24); degree as usize]
        );
    }

    #[test]
    fn rotate_left() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let l = ir.append_input_literal(Literal::U64(3));

        let res = ir.append_rotate_left(a, l);

        ir.append_output_ciphertext(res);

        let degree = 4096;

        let (keygen, context, _public_key, _private_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let galois_keys = keygen.create_galois_keys().unwrap();

        let a: Vec<u64> = (0..degree).into_iter().collect();

        let pt_0 = encoder.encode_unsigned(&a).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();

        let output = unsafe {
            run_program_unchecked(&ir, &[ct_0.into()], &evaluator, &None, &Some(&galois_keys))
                .unwrap()
        };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        let mut expected = (3..degree / 2).into_iter().collect::<Vec<u64>>();

        expected.append(&mut vec![0, 1, 2]);

        expected.append(&mut (degree / 2 + 3..degree).into_iter().collect::<Vec<u64>>());

        expected.append(&mut vec![degree / 2, degree / 2 + 1, degree / 2 + 2]);

        assert_eq!(encoder.decode_unsigned(&o_p).unwrap(), expected);
    }

    #[test]
    fn rotate_right() {
        let mut ir = FheProgram::new(SchemeType::Bfv);

        let a = ir.append_input_ciphertext(0);
        let l = ir.append_input_literal(Literal::U64(3));

        let res = ir.append_rotate_right(a, l);

        ir.append_output_ciphertext(res);

        let degree = 4096;

        let (keygen, context, _public_key, _private_key, encryptor, decryptor, evaluator) =
            setup_scheme(degree);

        let encoder = BFVEncoder::new(&context).unwrap();
        let galois_keys = keygen.create_galois_keys().unwrap();

        let a: Vec<u64> = (0..degree).into_iter().collect();

        let pt_0 = encoder.encode_unsigned(&a).unwrap();

        let ct_0 = encryptor.encrypt(&pt_0).unwrap();

        let output = unsafe {
            run_program_unchecked(&ir, &[ct_0.into()], &evaluator, &None, &Some(&galois_keys))
                .unwrap()
        };

        assert_eq!(output.len(), 1);

        let o_p = decryptor.decrypt(&output[0]).unwrap();

        let mut expected = vec![degree / 2 - 3, degree / 2 - 2, degree / 2 - 1];

        expected.append(&mut (0..degree / 2 - 3).into_iter().collect::<Vec<u64>>());

        expected.append(&mut vec![degree - 3, degree - 2, degree - 1]);

        expected.append(&mut (degree / 2..degree - 3).into_iter().collect::<Vec<u64>>());

        assert_eq!(encoder.decode_unsigned(&o_p).unwrap(), expected);
    }
}
