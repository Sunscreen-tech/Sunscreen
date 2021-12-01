use sunscreen_frontend_macros::{circuit};

struct Foo {}

impl Foo {
    #[circuit]
    fn panic_circuit(&self) {
    }
}

fn main() {
    
}