use backtrace::{Backtrace, BacktraceFrame};
use radix_trie::{Trie};
use std::collections::HashMap;

pub trait StackFrames {
    fn add_stack_trace(&mut self, key: Vec<u64>, val: Backtrace);

    fn get_stack_trace(&self, key: Vec<u64>);
}

impl StackFrames for Trie<Vec<u64>, BacktraceFrame> {
    /**
     * Adds an entire Backtrace to the trie by storing each BacktraceFrame.
     */

    fn add_stack_trace(&mut self, key: Vec<u64>, val: Backtrace) {
        let frames = val.frames().iter().clone();
        let mut temp_key: Vec<u64> = Vec::<u64>::new();

        for (index, frame) in key.iter().zip(frames) {
            temp_key.push(*index);
            self.insert(temp_key.clone(), frame.clone());
        }
    }

    /**
     * Returns a sequence of StackFrames given a node in the StackTrie.
     *
     * This needs to be implemented to just like concatenate strings/values together.
     * Otherwise we run into lifetime issues
     * You can't just append to a list and return the list
     */
    fn get_stack_trace(&self, _key: Vec<u64>) {}
}

/**
 * Allows for lookup of call stack information given a ProgramNode's `group_id`.
 */
struct StackFrameLookup {
    dict: HashMap<u64, Vec<u64>>,
    frames: Trie<Vec<u64>, Backtrace>,
}

impl StackFrameLookup {}
