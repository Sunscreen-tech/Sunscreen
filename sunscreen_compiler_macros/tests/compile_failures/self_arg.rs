use sunscreen_compiler_macros::{fhe_program};

struct Foo {}

impl Foo {
    #[fhe_program(scheme = "bfv")]
    fn panic_fhe_program(&self) {
    }
}

fn main() {
    
}