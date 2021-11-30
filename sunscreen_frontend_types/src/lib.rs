use std::cell::Cell;

pub struct InputCiphertext {

}

pub struct Context {
    inputs: Vec<InputCiphertext>
}

thread_local! {
    pub static CURRENT_CTX: Cell<Option<&'static Context>> = Cell::new(None);
}

impl Context {
    pub fn new() -> Self {
        Self {
            inputs: vec![]
        }
    }
}
