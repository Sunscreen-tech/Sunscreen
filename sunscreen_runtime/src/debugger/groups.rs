use crate::callstack::StackFrameInfo;
use backtrace::BacktraceFrame;
/**
 * Represents a group of `ProgramNodes` associated with an operation.
 *
 * Each program node stores a unique group ID, so we can store the nodes associated with an operation
 * by checking if the ID is contained in `grouped_nodes`.
 */

#[derive(Clone)]
pub struct ProgramGroup {
    operation: StackFrameInfo,
    grouped_nodes: Vec<u64>, // maybe make this a hashset for fast lookup
}

impl ProgramGroup {
    pub fn new(frame: &BacktraceFrame) -> Self {
        ProgramGroup {
            operation: StackFrameInfo::new(frame),
            grouped_nodes: Vec::new(),
        }
    }
}

pub struct ProgramContext {
    group_stack: Vec<ProgramGroup>,
}

impl ProgramContext {
    pub fn new() -> Self {
        ProgramContext {
            group_stack: Vec::new(),
        }
    }

    pub fn push(&mut self, group: ProgramGroup) {
        self.group_stack.push(group);
    }

    pub fn pop(&mut self) -> ProgramGroup {
        self.group_stack.pop().unwrap()
    }
}
