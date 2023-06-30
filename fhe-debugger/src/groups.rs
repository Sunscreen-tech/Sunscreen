use backtrace::{Backtrace, BacktraceFrame, SymbolName};
use radix_trie::Trie;
use std::collections::HashMap;
use std::path::Path;

/**
 * Stores information about individual stack frames.
 */
#[derive(Debug, Clone)]
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
    /**
     * Extracts relevant callee information from a `&BacktraceFrame`.
     */
    fn new(frame: &BacktraceFrame) -> Self {
        let frame_symbols = frame.symbols();
        let ip_as_bytes = (frame.ip() as usize).to_ne_bytes();
        StackFrameInfo {
            callee_name: frame_symbols[0]
                .name()
                .unwrap_or(SymbolName::new(&ip_as_bytes))
                .to_string(),
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

impl StackFrames for Trie<Vec<u64>, StackFrameInfo> {
    /**
     * Adds an entire Backtrace to the trie by storing each BacktraceFrame.
     * Keys are stored as lists for insertion.
     */

    fn add_stack_trace(&mut self, key: Vec<u64>, val: Backtrace) {
        let frames = val.frames().iter().clone();
        let mut temp_key: Vec<u64> = Vec::<u64>::new();

        for (index, frame) in key.iter().zip(frames) {
            temp_key.push(*index);
            let frame_info = StackFrameInfo::new(frame);
            self.insert(temp_key.clone(), frame_info);
        }
    }

    /**
     * Returns a sequence of StackFrames given a node in the StackTrie.
     */
    fn get_stack_trace(&self, key: Vec<u64>) -> Vec<StackFrameInfo> {
        let mut trace = Vec::<StackFrameInfo>::new();
        let mut temp_key = Vec::<u64>::new();

        for index in key {
            temp_key.push(index);
            let frame = self.get(&temp_key).unwrap();
            trace.push(frame.clone());
        }
        trace
    }
}

/**
 * Allows for lookup of call stack information given a ProgramNode's `group_id`.
 */
pub struct StackFrameLookup {
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
