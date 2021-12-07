use sunscreen_frontend_macros::{circuit};

struct Foo {}

impl Foo {
    #[circuit(scheme = "bfv")]
    fn panic_circuit(&self) {
    }
}

fn main() {
    
}