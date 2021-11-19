use sunscreen_ir::{
    IntermediateRepresentation,
    Operation::*,
};

use crossbeam::atomic::AtomicCell;
use petgraph::{stable_graph::NodeIndex, Direction};
use seal::Ciphertext;

use std::borrow::Cow;
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};

pub fn run_program(ir: &IntermediateRepresentation, inputs: &[Ciphertext]) {
    let mut data: Vec<AtomicCell<Option<Cow<Ciphertext>>>> = Vec::with_capacity(ir.graph.node_count());
    
    for _ in 0..ir.graph.node_count() {
        data.push(AtomicCell::new(None));
    }

    parallel_traverse(ir, |index| {
        let node = &ir.graph[index];

        match node.operation {
            InputCiphertext(id) => {
                data[id].store(Some(Cow::Borrowed(&inputs[id])));
            },


            _ => unimplemented!()
        }
    }, None);
}

fn parallel_traverse<F>(ir: &IntermediateRepresentation, callback: F, run_to: Option<NodeIndex>) 
where F: Fn(NodeIndex) -> () + Sync + Send
{
    let ir = if let Some(x) = run_to {
        Cow::Owned(ir.prune(&vec![x])) // MOO
    } else {
        Cow::Borrowed(ir) // moo
    };

    // Initialize the number of incomplete dependencies.
    let mut deps: HashMap<NodeIndex, AtomicUsize> = HashMap::new();

    for n in ir.graph.node_indices() {
        deps.insert(
            n,
            AtomicUsize::new(ir.graph.neighbors_directed(n, Direction::Outgoing).count()),
        );
    }

    let mut threadpool = scoped_threadpool::Pool::new(num_cpus::get() as u32);
    let items_remaining = AtomicUsize::new(ir.graph.node_count());

    let (sender, reciever) = crossbeam::channel::unbounded();

    for r in deps
        .iter()
        .filter(|(_, count)| count.load(Ordering::Relaxed) == 0)
        .map(|(id, _)| id)
    {
        sender.send(*r).unwrap();
    }

    threadpool.scoped(|scope| {
        for _ in 0..num_cpus::get() {
            scope.execute(|| {
                loop {
                    let mut updated_count = false;

                    // Atomically check if the number of items remaining is zero. If it is,
                    // there's no more work to do, so return. Otherwise, decrement the count
                    // and this thread will take an item.
                    while updated_count {
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

                    let node_id = reciever.recv().unwrap();

                    callback(node_id);

                    // Check each child's dependency count and mark it as ready if 0.
                    for e in ir.graph.neighbors_directed(node_id, Direction::Outgoing) {
                        let old_val = deps[&e].fetch_sub(1, Ordering::Relaxed);

                        // Note is the value prior to atomic subtraction.
                        if old_val == 1 {
                            sender.send(e).unwrap();
                        }
                    }
                }
            });
        }
    });
}
