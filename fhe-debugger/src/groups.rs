use radix_trie::{Trie, SubTrieMut, SubTrie};

/**
 * Stores information about stack calls. 
 */
struct StackFrame {
    /**
     * The function name.
     */
    callee: String,

    /** 
     * The file the function is defined in.
     */
    callee_file: String, 

    /**
     * The file the function is called from.
     */
    caller_file: String,

    /**
     * The line the function is called from.
     */
    caller_line: u64,
}
/**
 * A wrapper struct to efficiently store stack traces for each program node,
 */
struct StackTrie<u64, StackFrame> {
    /**
     * Stores stack frames as nodes.
     */
    trie: Trie<u64, StackFrame>,
    /**
     * Allows for indexing into a stack frame given a `group_id` associated with a program node.
     */
    group_id: u64
}

impl StackTrie {

    fn new() {
        Trie::new()
    }

    /** 
     * Returns a sequence of StackFrames given a node in the StackTrie.
     */
    fn get_stack_trace(&self) -> Vec<StackFrame> {
        let ancestors = Vec::<StackFrame>::new();
        let ancestor: SubTrie<u64, StackFrame> = self.get_ancestor();
        while let Some(ancestor) = ancestor {
            ancestors.push(ancestor);
            ancestor = ancestor.get_ancestor();
        }
        ancestors 
    }
}