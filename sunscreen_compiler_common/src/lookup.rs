use backtrace::{Backtrace, BacktraceFrame, SymbolName};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/**
 * Stores information about individual stack frames.
 */
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
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
                .iter()
                .nth(0)
                .map(|x| x.name().unwrap_or(SymbolName::new(&ip_as_bytes)))
                .unwrap_or(SymbolName::new(&ip_as_bytes))
                .to_string(),
            callee_file: frame_symbols
                .iter()
                .nth(0)
                .map(|x| x.filename().unwrap_or(Path::new("")))
                .unwrap_or(Path::new(""))
                .to_string_lossy()
                .into_owned(),
            callee_lineno: frame_symbols
                .iter()
                .nth(0)
                .map(|x| x.lineno().unwrap_or(0))
                .unwrap_or(0),
            callee_col: frame_symbols
                .iter()
                .nth(0)
                .map(|x| x.colno().unwrap_or(0))
                .unwrap_or(0),
        }
    }

    /**
     * Serializes stack frame info.
     */
    pub fn serialize(&self) -> String {
        format!(
            "{}-{}-{}",
            self.callee_name, self.callee_file, self.callee_lineno
        )
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
     * Given a node's serialized stack trace, return its `stack_id`.
     */
    pub data_id_lookup: HashMap<String, u64>,
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

type Group = String;
/**
 * Lookup structure for the one-to-one correspondence between grouping information and a ProgramNode's `group_id`.
 */
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct GroupLookup {
    /**
     * Given a node's `group_id`, return the node's group.
     */
    pub id_data_lookup: HashMap<u64, Group>,

    /**
     * Given a node's group name, return its `group_id`.
     */
    pub data_id_lookup: HashMap<Group, u64>,
}

impl GroupLookup {
    /**
     * Creates a new `GroupLookup` object.
     */
    pub fn new() -> Self {
        Self {
            id_data_lookup: HashMap::new(),
            data_id_lookup: HashMap::new(),
        }
    }
}

impl Default for GroupLookup {
    fn default() -> Self {
        Self::new()
    }
}
/*
/**
 * Support for retrieval and insertion from lookup structures.
 */
pub trait IdLookup<K, V> {
    /**
     * Inserts data into the lookup structure.
     */
    fn data_to_id(&mut self, key: K, val: V) -> u64;

    /**
     * Retrieves data from the lookup structure.
     */
    fn id_to_data(&self, id: u64) -> Result<V, Error>;
}

/**
 * Stores information about individual stack frames.
 */
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
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

/**
 * Allows for lookup of call stack information given a ProgramNode's `group_id`.
 *
 * Maybe: use stack frame as key, node id as value.
 *
 * Forward lookup: "given a stack frame, give me the stack ID" is what the trie is for
 *  We need this for "while constructing the graph, want to know 'is there anything else with the same stack trace'"
 *  If it is, let me reuse the same stack id. This way every node with the same stack trace has the same stack id
 *
 * So in `add_node`, need to look up to see if this stack id already exists. If it exists, just assign that and keep stack_counter the same
 * If it doesn't exist, then assign and increment stack_counter
 *
 * Use a hashmap (key: stack id, val: pointer to node in the trie, use unsafe to dereference it).
 *  Gives reverse lookup: given a stack id, what nodes does it correspond to
 *  Pointers not serializable so this could be a problem
 *  Need to figure out what to store as the value here: just need something that'll allow me to reference a node in the trie
 *  Value could just be the entire stack trace
 */
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct StackFrameLookup {
    /**
     * Given a ProgramNode's `group_id`, return the key used in the `frames` trie for retrieval.
     */
    pub dict: HashMap<u64, Vec<u64>>,
    /**
     * Retrieves `Vec<StackFrameInfo>` objects representing a stack trace, given values from `dict`.
     */
    pub frames: Trie<Vec<u64>, StackFrameInfo>,
}

impl StackFrameLookup {
    /**
     * Creates a new `StackFrameLookup` object.
     */
    pub fn new() -> Self {
        StackFrameLookup {
            dict: HashMap::<u64, Vec<u64>>::new(),
            frames: Trie::<Vec<u64>, StackFrameInfo>::new(),
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

impl IdLookup<Vec<u64>, Vec<StackFrameInfo>> for StackFrameLookup {
    /**
     * Inserts the backtrace associated with a node into the trie. Backtraces are stored as a `Vec<StackFrameInfo>`.
     * Returns the node's group_id.
     * This is analogous to an insertion method.
     */

    // TODO: maybe update the interface here to also take in an id for insertion reasons?
    fn data_to_id(&mut self, key: Vec<u64>, val: Vec<StackFrameInfo>) -> u64 {
        let mut temp_key = Vec::new();

        for (index, frame_info) in key.iter().zip(val) {
            temp_key.push(*index);
            self.frames.insert(temp_key.clone(), frame_info);
        }

        self.dict.insert(0, key);
        // TODO: somehow need to get the node's id?
        0
    }

    /**
     * Returns the backtrace associated with a node given the node's group_id.
     * This is analogous to a retrieval method.
     */
    fn id_to_data(&self, id: u64) -> Result<Vec<StackFrameInfo>, Error> {
        let key = self.dict.get(&id);
        let mut trace = Vec::<StackFrameInfo>::new();
        let _temp_key = Vec::<u64>::new();

        while let Some(_index) = key {
            let next_frame = key.ok_or(Error::IdNotFound).and_then(|frame_id| {
                self.frames
                    .get(frame_id)
                    .map(Ok)
                    .unwrap_or_else(|| Err(Error::FrameNotFound))
            });

            trace.push(next_frame.unwrap().clone());
        }
        Ok(trace)
    }
}

type Group = String;

/**
 * Stores information about groups.
 */
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct GroupLookup {
    /**
     * Given a ProgramNode's `group_id`, return the key used in the `groups` trie for retrieval.
     */
    pub dict: HashMap<u64, Vec<u64>>,
    /**
     * Retrieves `Vec<Group>` objects representing sequential groups, given values from `dict`.
     */
    pub groups: Trie<Vec<u64>, Vec<Group>>,
}

impl GroupLookup {
    /**
     * Creates a new `GroupLookup` object.
     */
    pub fn new() -> Self {
        Self {
            dict: HashMap::new(),
            groups: Trie::new(),
        }
    }
}

// TODO: implement these
impl IdLookup<Vec<u64>, String> for GroupLookup {
    fn data_to_id(&mut self, _key: Vec<u64>, _val: String) -> u64 {
        0
    }

    fn id_to_data(&self, _id: u64) -> Result<String, Error> {
        Ok("hi".to_owned())
    }
}

impl Default for GroupLookup {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug)]
/**
 * Lookup error types.
 */
pub enum Error {
    /**
     * Returned if a node ID isn't found in the initial lookup structure.
     */
    IdNotFound,
    /**
     * Returned if a stack frame isn't found in the trie.
     */
    FrameNotFound,
}
*/
