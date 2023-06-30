use backtrace::{Backtrace, BacktraceFrame, SymbolName};
use radix_trie::Trie;
use std::collections::HashMap;
use std::path::Path;

/**
 * Stores information about individual stack frames.
 */
#[derive(Debug)]
pub struct StackFrameInfo {
    /**
     * Name of the function called.
     */
    callee_name: String,

    /**
     * Name of the file where the callee is defined.
     */
    callee_file: String,

    /**
     * The line number in the file where the callee is defined.
     */
    callee_lineno: u32,

    /**
     * The column index in the file where the callee is defined.
     */
    callee_col: u32,
}

impl StackFrameInfo {
    fn new(frame: &BacktraceFrame) -> Self {
        let frame_symbols = frame.symbols();
        StackFrameInfo {
            callee_name: frame_symbols[0].name().unwrap_or(SymbolName::new(&frame.ip())).to_string(),
            callee_file: frame_symbols[0]
                .filename()
                .unwrap_or(Path::new("No such file"))
                .to_string_lossy()
                .into_owned(),
            callee_lineno: frame_symbols[0].lineno().unwrap_or(0),
            callee_col: frame_symbols[0].colno().unwrap_or(0),
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
            println!("{:?}", frame.symbols()[0].filename());
            println!("{:?}", frame.symbols()[0].lineno());
            println!("{:?}", frame.symbols()[0].colno());
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
        let mut temp_key = Vec::<u64>::new();

        for index in key {
            temp_key.push(index);

            let frame = self.get(&temp_key).unwrap();
            let frame_info = StackFrameInfo::new(frame);
            trace.push(frame_info);
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
            frames: Trie::<Vec<u64>, Backtrace>::new(),
        }
    }
}
