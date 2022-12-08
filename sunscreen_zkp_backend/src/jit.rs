use std::{any::Any, collections::HashMap, convert::Infallible, fmt::Debug, hash::Hash, sync::Arc};

use crate::{
    exec::{ExecutableZkpProgram, Operation as ExecOperation},
    BackendField, BigInt, Error, Gadget, Result,
};
use petgraph::{stable_graph::NodeIndex, visit::EdgeRef, Direction};
use sunscreen_compiler_common::{
    forward_traverse, forward_traverse_mut,
    transforms::{GraphTransforms, Transform},
    CompilationResult, EdgeInfo, GraphQueryError, NodeInfo, Operation as OperationTrait,
};

#[derive(Clone)]
pub enum Operation {
    PrivateInput(usize),
    PublicInput(usize),
    HiddenInput(usize),

    InvokeGadget(Arc<dyn Gadget>),

    Add,

    Mul,

    Sub,

    Neg,

    Constraint(BigInt),

    Constant(BigInt),
}

impl Hash for Operation {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        match self {
            Self::PrivateInput(x) => {
                state.write_u8(0);
                state.write_usize(*x);
            }
            Self::PublicInput(x) => {
                state.write_u8(1);
                state.write_usize(*x);
            }
            Self::HiddenInput(x) => {
                state.write_u8(2);
                state.write_usize(*x);
            }
            Self::Constraint(x) => {
                state.write_u8(3);
                x.hash(state);
            }
            Self::Constant(x) => {
                state.write_u8(4);
                x.hash(state);
            }
            Self::InvokeGadget(g) => {
                state.write_u8(5);
                g.type_id().hash(state);
            }
            Self::Add => state.write_u8(6),
            Self::Sub => state.write_u8(7),
            Self::Mul => state.write_u8(8),
            Self::Neg => state.write_u8(9),
        }
    }
}

impl PartialEq for Operation {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::PrivateInput(x), Self::PrivateInput(y)) => x == y,
            (Self::PublicInput(x), Self::PublicInput(y)) => x == y,
            (Self::HiddenInput(x), Self::HiddenInput(y)) => x == y,
            (Self::Constraint(x), Self::Constraint(y)) => x == y,
            (Self::Constant(x), Self::Constant(y)) => x == y,
            (Self::InvokeGadget(x), Self::InvokeGadget(y)) => x.type_id() == y.type_id(),
            (Self::Add, Self::Add) => true,
            (Self::Sub, Self::Sub) => true,
            (Self::Mul, Self::Mul) => true,
            (Self::Neg, Self::Neg) => true,
            _ => false,
        }
    }
}

impl Eq for Operation {}

impl Debug for Operation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PrivateInput(x) => write!(f, "PrivateInput({x})"),
            Self::PublicInput(x) => write!(f, "PublicInput({x})"),
            Self::HiddenInput(x) => write!(f, "HiddenInput({x})"),
            Self::Constraint(x) => write!(f, "Constraint({x:#?})"),
            Self::Constant(x) => write!(f, "Constant({x:#?})"),
            Self::InvokeGadget(g) => write!(f, "InvokeGadget({})", g.debug_name()),
            Self::Add => write!(f, "Add"),
            Self::Sub => write!(f, "Sub"),
            Self::Mul => write!(f, "Mul"),
            Self::Neg => write!(f, "Neg"),
        }
    }
}

impl OperationTrait for Operation {
    fn is_binary(&self) -> bool {
        matches!(self, Operation::Add | Operation::Sub | Operation::Mul)
    }

    fn is_commutative(&self) -> bool {
        matches!(self, Operation::Add | Operation::Mul)
    }

    fn is_unary(&self) -> bool {
        matches!(self, Operation::Neg)
    }

    fn is_unordered(&self) -> bool {
        matches!(self, Operation::Constraint(_))
    }

    fn is_ordered(&self) -> bool {
        matches!(self, Operation::InvokeGadget(_))
    }
}

/**
 * A ZKP program that has been through frontend compilation, but not yet
 * JIT'd.
 */
pub type CompiledZkpProgram = CompilationResult<Operation>;

fn validate_zkp_program(_prog: &CompiledZkpProgram) -> Result<()> {
    // TODO: check for cycles, assert each node has correct inputs.

    Ok(())
}

/**
 * Just in time compile a [`CompiledZkpProgram`] into an [`ExecutableZkpProgram`] for creating proofs.
 */
pub fn jit_prover<U>(
    prog: &CompiledZkpProgram,
    public_inputs: &[U],
    private_inputs: &[U],
) -> Result<ExecutableZkpProgram>
where
    U: BackendField,
{
    let mut prog = prog.clone();

    let expected_private_inputs = prog
        .node_weights()
        .filter(|x| matches!(x.operation, Operation::PrivateInput(_)))
        .count();

    if private_inputs.len() != expected_private_inputs {
        return Err(Error::inputs_mismatch(&format!(
            "Expected {} private inputs, received {}",
            expected_private_inputs,
            private_inputs.len()
        )));
    }

    constrain_public_inputs(&mut prog, public_inputs)?;

    validate_zkp_program(&prog)?;

    let mut node_outputs: HashMap<NodeIndex, U> = HashMap::new();

    // Run the graph as a computation (not a ZKP) to compute all the
    // gadget hidden input values.
    forward_traverse(&prog, |query, id| {
        let node = query.get_node(id).unwrap();

        match node.operation {
            Operation::PublicInput(x) => {
                if x >= public_inputs.len() {
                    return Err(Error::malformed_zkp_program(&format!("JIT error: Node {:#?}: load public input {} out of bounds. (There are {} public inputs)", id, x, public_inputs.len())));
                }

                let val = &public_inputs[x];

                node_outputs.insert(id, val.clone());
            }
            Operation::PrivateInput(x) => {
                if x >= private_inputs.len() {
                    return Err(Error::malformed_zkp_program(&format!("JIT error: Node {:#?}: load private input {} out of bounds. (There are {} public inputs)", id, x, private_inputs.len())));
                }

                node_outputs.insert(id, private_inputs[x].clone());
            }
            Operation::HiddenInput(_) => {} // Gadgets populate these outputs.
            Operation::Add => {
                let (left, right) = query.get_binary_operands(id)?;

                let output = node_outputs[&left].clone() + node_outputs[&right].clone();

                node_outputs.insert(id, output);
            }
            Operation::Mul => {
                let (left, right) = query.get_binary_operands(id)?;

                let output = node_outputs[&left].clone() * node_outputs[&right].clone();

                node_outputs.insert(id, output);
            }
            Operation::Sub => {
                let (left, right) = query.get_binary_operands(id)?;

                let output = node_outputs[&left].clone() - node_outputs[&right].clone();

                node_outputs.insert(id, output);
            }
            Operation::Neg => {
                let left = query.get_unary_operand(id)?;

                let output = -node_outputs[&left].clone();

                node_outputs.insert(id, output);
            }
            Operation::Constraint(_) => {} // Constraints produce no outputs
            Operation::Constant(x) => {
                node_outputs.insert(id, U::try_from(x)?);
            }
            Operation::InvokeGadget(ref g) => {
                // Have the gadget tell us what the values are for the
                // hidden inputs and assign their value.
                let arg_indices = query.get_ordered_operands(id)?;

                let args = arg_indices
                    .iter()
                    .map(|x| node_outputs[x].clone().into())
                    .collect::<Vec<BigInt>>();

                let hidden_inputs = g.compute_inputs(&args);

                let mut next_nodes = query
                    .edges_directed(id, Direction::Outgoing)
                    .map(|x| {
                        if !matches!(x.weight(), EdgeInfo::Unary) {
                            return Err(GraphQueryError::NotUnaryOperation)?;
                        }

                        match prog[x.target()].operation {
                            Operation::HiddenInput(arg_idx) => {
                                Ok(SortableEdge(x.target(), arg_idx))
                            }
                            _ => Err(Error::malformed_zkp_program(&format!(
                                "Node {:#?} is not a Operation::HiddenInput",
                                x.target()
                            ))),
                        }
                    })
                    .collect::<Result<Vec<SortableEdge>>>()?;

                #[derive(Eq)]
                struct SortableEdge(NodeIndex, usize);

                impl PartialEq for SortableEdge {
                    fn eq(&self, other: &Self) -> bool {
                        self.1 == other.1
                    }
                }

                impl PartialOrd for SortableEdge {
                    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
                        self.1.partial_cmp(&other.1)
                    }
                }

                impl Ord for SortableEdge {
                    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
                        self.1.cmp(&other.1)
                    }
                }

                next_nodes.sort();

                // Assert the HiddenInputs produce a range
                // 0..hidden_inputs.len()
                if hidden_inputs.len() != next_nodes.len() {
                    return Err(Error::malformed_zkp_program(&format!(
                        "Gadget {} at node id {:#?} has incorrect number of hidden inputs. Expected {}: actual: {}",
                        g.debug_name(),
                        id,
                        args.len(),
                        next_nodes.len()
                    )));
                }

                // For each hidden node's index, assign the computed
                // argument
                for (i, e) in next_nodes.iter().enumerate() {
                    // Continuing to assert the argument indices form
                    // a range...
                    if i != e.1 {
                        return Err(Error::malformed_zkp_program(&format!(
                            "Invalid hidden argument index. Expected: {} actual: {}",
                            i, e.1
                        )));
                    }

                    node_outputs.insert(e.0, args[i].try_into()?);
                }
            }
        };

        Ok::<_, Error>(())
    })?;

    jit_common(prog, public_inputs, Some(node_outputs))
}

pub fn jit_verifier<U>(
    prog: &CompiledZkpProgram,
    public_inputs: &[U],
) -> Result<ExecutableZkpProgram>
where
    U: BackendField,
{
    let mut prog = prog.clone();

    constrain_public_inputs(&mut prog, public_inputs)?;

    jit_common(prog, public_inputs, None)
}

fn jit_common<U>(
    mut prog: CompiledZkpProgram,
    public_inputs: &[U],
    node_outputs: Option<HashMap<NodeIndex, U>>,
) -> Result<ExecutableZkpProgram>
where
    U: BackendField,
{
    // Remove Gadgets, as we should have already extracted their outputs.
    for n in prog
        .node_indices()
        .filter(|x| matches!(prog[*x].operation, Operation::InvokeGadget(_)))
        .collect::<Vec<NodeIndex>>()
    {
        prog.remove_node(n);
    }

    let executable_graph = prog.map(
        |id, n| match n.operation {
            Operation::Add => NodeInfo::new(ExecOperation::Add),
            Operation::Mul => NodeInfo::new(ExecOperation::Mul),
            Operation::Sub => NodeInfo::new(ExecOperation::Sub),
            Operation::Neg => NodeInfo::new(ExecOperation::Neg),
            Operation::Constant(x) => NodeInfo::new(ExecOperation::Constant(x)),
            Operation::Constraint(x) => NodeInfo::new(ExecOperation::Constraint(x)),
            Operation::PublicInput(id) => NodeInfo::new(ExecOperation::Input(id)),
            Operation::PrivateInput(id) => {
                NodeInfo::new(ExecOperation::Input(public_inputs.len() + id))
            }
            Operation::HiddenInput(_) => match node_outputs.as_ref() {
                Some(node_outputs) => NodeInfo::new(ExecOperation::HiddenInput(Some(
                    node_outputs[&id].clone().into(),
                ))),
                None => NodeInfo::new(ExecOperation::HiddenInput(None)),
            },
            Operation::InvokeGadget(_) => unreachable!("Not all gadgets processed and removed"),
        },
        |_, e| *e,
    );

    Ok(CompilationResult(executable_graph))
}

fn constrain_public_inputs<U>(prog: &mut CompiledZkpProgram, public_inputs: &[U]) -> Result<()>
where
    U: BackendField,
{
    let mut arg_indices = prog
        .node_weights()
        .filter_map(|x| match x.operation {
            Operation::PublicInput(x) => Some(x),
            _ => None,
        })
        .collect::<Vec<usize>>();

    // Caller should fallibly check this.
    if public_inputs.len() != arg_indices.len() {
        return Err(Error::inputs_mismatch(&format!(
            "Expected {} public inputs, found {}",
            arg_indices.len(),
            public_inputs.len()
        )));
    }

    arg_indices.sort();

    for (i, j) in arg_indices.iter().enumerate() {
        if i != *j {
            return Err(Error::malformed_zkp_program(&format!(
                "Public inputs do not form a range 0..{}",
                arg_indices.len()
            )));
        }
    }

    forward_traverse_mut(prog, |query, id| {
        let mut transforms = GraphTransforms::new();

        if let Operation::PublicInput(x) = query.get_node(id).unwrap().operation {
            let as_bigint: BigInt = public_inputs[x].clone().into();

            let constraint = transforms.push(Transform::AddNode(NodeInfo {
                operation: Operation::Constraint(as_bigint),
            }));
            transforms.push(Transform::AddEdge(
                id.into(),
                constraint.into(),
                EdgeInfo::Unordered,
            ));
        };

        Ok::<_, Infallible>(transforms)
    })
    .unwrap();

    Ok(())
}
