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
trait StackFrames {
    fn add_stack_trace(&self, key: Vec<u64>, val: StackFrame);

    fn get_stack_trace(&self, key: Vec<u64>);
}

// Implement StackFrames for Trie
impl StackFrames for Trie<Vec<u64>, StackFrame> {
    
    /**
     * Adds a stack trace to the StackTrie.
     */

    fn add_stack_trace(&self, key: Vec<u64>, val: StackFrame) {

    }

    /** 
     * Returns a sequence of StackFrames given a node in the StackTrie.
     * 
     * This needs to be implemented to just like concatenate strings/values together. 
     * Otherwise we run into lifetime issues
     * You can't just append to a list and return the list
     */
    fn get_stack_trace(&self, key: Vec<u64>) {

    }
}

/**
 * Allows for lookup of call stack information given a ProgramNode's `group_id`.
 */
struct StackFrameLookup {
    dict: HashMap<u64, Vec<u64>>,
    frames: Trie<Vec<u64>, StackFrame>
}

impl StackFrameLookup {
    
}