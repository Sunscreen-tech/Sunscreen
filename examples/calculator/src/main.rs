mod rational;

use std::thread::{self, JoinHandle};
use sunscreen_compiler::{circuit, Compiler};
use rational::Rational;

fn alice() -> JoinHandle<()> {
    thread::spawn(|| {

    })
}

fn bob() -> JoinHandle<()> {
    thread::spawn(|| {
        #[circuit(scheme = "bfv")]
        fn add(a: Rational, b: Rational) -> Rational {
            a + b
        }

    })
}

fn main() {
    let a = alice();
    let b = bob();

    a.join();
    b.join();
}