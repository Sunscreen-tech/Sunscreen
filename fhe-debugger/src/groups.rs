use radix_trie::{Trie, SubTrieMut, SubTrie};
use std::backtrace::{Backtrace, BacktraceFrame};

/**
 * Stores information about stack calls. 
 */
pub struct StackFrame {
    /**
     * The function name.
     */
    pub callee: String,

    /** 
     * The file the function is defined in.
     */
    pub callee_file: String, 

    /**
     * The file the function is called from.
     */
    pub caller_file: String,

    /**
     * The line the function is called from.
     */
    pub caller_line: u64,
}
/**
 * A wrapper struct to efficiently store stack traces for each program node,
 */
pub struct StackTrie {
    /**
     * Stores stack frames as nodes.
     */

    //TODO: maybe this needs to be updated to BacktraceFrame? not sure, very little documentation on this 
    pub trie: Trie<u64, StackFrame>,
    /**
     * Allows for indexing into a stack frame given a `group_id` associated with a program node.
     */
    pub group_id: u64
}

impl StackTrie {
    /**
     * Creates an empty StackTrie.
     */
    fn new() -> Self {
        StackTrie {
            trie: Trie::new(),
            group_id: 0
        }
    }

    /** 
     * Returns a sequence of StackFrames given a node in the StackTrie.
     */
    fn get_stack_trace(&self) -> Vec<StackFrame> {
        let mut ancestors = Vec::<StackFrame>::new();
        let mut ancestor = self.trie.subtrie(&self.group_id);
        while let Some(subtrie) = ancestor {
            ancestors.push(*subtrie.value().unwrap());
            ancestor = self.trie.get_ancestor(&self.group_id);
        }
        ancestors
    }
    /**
     * Adds a stack trace to the StackTrie.
     */
    fn add_stack_trace(&self, trace: Vec::<StackFrame>) -> Self {

        let mut current = self.trie.subtrie_mut(self.group_id).unwrap(); 

        for frame in trace.iter() {
            // TODO: Insert with a group ID, not 0
            current = current.insert(0, frame);
        }
    }
}