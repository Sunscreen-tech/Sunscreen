use backtrace::{Backtrace, BacktraceFrame, SymbolName};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;

/**
 * Stores information about individual stack frames.
 */
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
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
    pub fn new(frame: &BacktraceFrame) -> Self {
        let frame_symbols = frame.symbols();
        let ip_as_bytes = (frame.ip() as usize).to_ne_bytes();

        StackFrameInfo {
            callee_name: frame_symbols
                .first()
                .and_then(|c| c.name())
                .unwrap_or(SymbolName::new(&ip_as_bytes))
                .to_string(),
            callee_file: frame_symbols
                .first()
                .and_then(|c| c.filename())
                .unwrap_or(Path::new("No such file"))
                .to_string_lossy()
                .into_owned(),
            callee_lineno: frame_symbols.first().and_then(|c| c.lineno()).unwrap_or(0),
            callee_col: frame_symbols.first().and_then(|c| c.colno()).unwrap_or(0),
        }
    }
}

/**
 * Lookup structure for the one-to-one correspondence between call stack information and a ProgramNode's `stack_id`.
 */
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct StackFrameLookup {
    /**
     * Given a node's `stack_id`, return the node's stack trace.
     */
    pub id_data_lookup: HashMap<u64, Vec<StackFrameInfo>>,

    /**
     * Given a node's hashed stack trace, return its `stack_id`.
     */
    pub data_id_lookup: HashMap<u64, u64>,
}

impl StackFrameLookup {
    /**
     * Creates a new `StackFrameLookup` object.
     */
    pub fn new() -> Self {
        Self {
            id_data_lookup: HashMap::new(),
            data_id_lookup: HashMap::new(),
        }
    }

    /**
     * Extracts backtrace info, turning it into a `Vec<StackFrameInfo>`.
     */
    pub fn backtrace_to_stackframes(&self, bt: Backtrace) -> Vec<StackFrameInfo> {
        let mut trace = Vec::<StackFrameInfo>::new();
        let frames = bt.frames();
        for frame in frames {
            trace.push(StackFrameInfo::new(frame));
        }
        trace
    }
}

impl Default for StackFrameLookup {
    fn default() -> Self {
        Self::new()
    }
}

/**
 *
 */
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Group {
    /** */
    pub id: u64,
    /** */
    pub name: String,
    /** */
    pub source: String,
    /** */
    pub parent: Option<u64>,
    /** */
    pub node_ids: HashSet<u64>,
    /** */
    pub node_inputs: Vec<u64>,
    /** */
    pub node_outputs: Vec<u64>,
}

impl Group {
    /** */
    pub fn new(id: u64, name: String, parent: Option<u64>, source: String) -> Self {
        Self {
            id,
            name,
            parent,
            source,
            node_ids: HashSet::new(),
            node_inputs: vec![],
            node_outputs: vec![],
        }
    }
}

/**
 * Lookup structure for the one-to-one correspondence between grouping information and a ProgramNode's `group_id`.
 */
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct GroupLookup {
    /**
     * Given a node's `group_id`, return the node's group.
     */
    pub id_data_lookup: HashMap<u64, Group>,
}

impl GroupLookup {
    /**
     * Creates a new `GroupLookup` object.
     */
    pub fn new() -> Self {
        Self {
            id_data_lookup: HashMap::new(),
        }
    }

    /**
     * Gets the child group nodes of a group.
     */
    pub fn children_of(&self, id: u64) -> Vec<u64> {
        self.id_data_lookup
            .values()
            .filter_map(|x| {
                if x.parent == Some(id) {
                    Some(x.id)
                } else {
                    None
                }
            })
            .collect()
    }
}

impl Default for GroupLookup {
    fn default() -> Self {
        Self::new()
    }
}
