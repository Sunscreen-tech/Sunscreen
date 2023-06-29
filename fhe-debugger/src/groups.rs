use backtrace::{Backtrace, BacktraceFrame};
use radix_trie::Trie;
use std::collections::HashMap;

// TODO: implement Debug for formatting purposes
// TODO: write documentation/comments for fields
pub struct StackFrameInfo {
    callee_name: String,
    callee_file: String,
    caller_name: String,
    caller_file: String,
    caller_lineno: u64,
}

impl StackFrameInfo {
    fn new(frame: &BacktraceFrame) -> Self {
        let frame_symbols = frame.symbols();
        StackFrameInfo {
            // TODO: figure out how to store this information
            callee_name: frame_symbols[0].name().unwrap().to_string(),
            callee_file: "".to_string(), //frame_symbols.filename().unwrap().to_string(),
            caller_name: "".to_string(),
            caller_file: "".to_string(),
            caller_lineno: 0,
        }
    }
}

pub trait StackFrames {
    fn add_stack_trace(&mut self, key: Vec<u64>, val: Backtrace);

    fn get_stack_trace(&self, key: Vec<u64>) -> Vec<StackFrameInfo>;
}

impl StackFrames for Trie<Vec<u64>, BacktraceFrame> {
    /**
     * Adds an entire Backtrace to the trie by storing each BacktraceFrame.
     * Keys are stored as lists for insertion.
     */

    fn add_stack_trace(&mut self, key: Vec<u64>, val: Backtrace) {
        let frames = val.frames().iter().clone();
        let mut temp_key: Vec<u64> = Vec::<u64>::new();

        for (index, frame) in key.iter().zip(frames) {
            temp_key.push(*index);
            // Don't unwrap here, instead should emit a warning like "need to turn on debug=true"
            // So if debug = false, we should just emit the instruction pointer
            // Otherwise try to emit symbol information

            // Rick's suggestion: make a helper function that attempts to write as much symbol info as possible
            // If any of that info is captured, then display that
            // Otherwise just show the instruction pointer
            println!("{:?}", frame.symbols()[0].name());
            // unwrap_or() will attempt to unwrap if it's a value, otherwise a default
            // so use instructionpointer.tostring() or something as default value

            // For these ones, just use unwrap_or_default() to get the empty string
            println!("{:?}", frame.symbols()[0].filename().unwrap());
            println!("{:?}", frame.symbols()[0].lineno().unwrap());
            println!("{:?}", frame.symbols()[0].colno().unwrap());
            println!();
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
    fn get_stack_trace(&self, key: Vec<u64>) -> Vec<StackFrameInfo> {
        let mut trace = Vec::<StackFrameInfo>::new();
        let mut temp_key = key;
        while !temp_key.is_empty() {
            let frame = self.get(&temp_key).unwrap();
            let frame_info = StackFrameInfo::new(frame);
            trace.push(frame_info);
            temp_key.pop();
        }
        trace
    }
}

/**
 * Allows for lookup of call stack information given a ProgramNode's `group_id`.
 */
struct StackFrameLookup {
    dict: HashMap<u64, Vec<u64>>,
    frames: Trie<Vec<u64>, Backtrace>,
}

impl StackFrameLookup {
    fn new() -> Self {
        StackFrameLookup { 
            dict: HashMap::<u64, Vec<u64>>::new(), 
            frames: Trie::<Vec<u64>, Backtrace>::new() 
        }
    }

}
