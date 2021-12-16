mod rational;

use std::thread::{self, JoinHandle};
use sunscreen_compiler::{circuit};
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

    a.join().unwrap();
    b.join().unwrap();
}