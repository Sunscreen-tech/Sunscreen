use std::backtrace::Backtrace;


fn main() {
    // Capture a backtrace
    let backtrace = Backtrace::new();

    // Print the backtrace
    println!("Backtrace: {:?}", backtrace);
}
