use std::io::{self, Write};
use std::sync::mpsc::{Receiver, Sender};
use std::thread::{self, JoinHandle};
use sunscreen::{
    fhe_program,
    types::{bfv::Rational, Cipher},
    Application, Ciphertext, Compiler, Params, PlainModulusConstraint, PublicKey, Runtime,
    RuntimeError,
};

fn help() {
    println!("This is a privacy preserving calculator. You can add, subtract, multiply, divide decimal values. The operation is sent to Bob in cleartext while the operands
    are encrypted. Bob chooses an FHE program corresponding to the selected operation and computes the result. Additionally, Bob saves the last computed value as `ans`, which you may use as either operand.");
    println!("Since this example is to demo encryption, not parsing, you must insert exactly one space between the operand and values.");
    println!("Type exit to quit.");
    println!("Example:");
    println!(">> 3 + 6.5");
    println!("9.5");
    println!(">> ans / 5");
    println!("1.9");
    println!();
}

enum Term {
    Ans,
    F64(f64),
    Encrypted(Ciphertext),
}

enum Operand {
    Add,
    Sub,
    Mul,
    Div,
}

struct Expression {
    left: Term,
    op: Operand,
    right: Term,
}

enum ParseResult {
    Help,
    Exit,
    Expression(Box<Expression>),
}

enum Error {
    ParseError,
}

fn parse_input(line: &str) -> Result<ParseResult, Error> {
    if line == "help" {
        return Ok(ParseResult::Help);
    } else if line == "exit" {
        return Ok(ParseResult::Exit);
    }

    let mut terms = line.split(' ');

    let left = terms.next().ok_or(Error::ParseError)?;

    let left_term = if left == "ans" {
        Term::Ans
    } else {
        Term::F64(left.parse::<f64>().map_err(|_| Error::ParseError)?)
    };

    let operand = terms.next().ok_or(Error::ParseError)?;

    let operand = if operand == "+" {
        Operand::Add
    } else if operand == "-" {
        Operand::Sub
    } else if operand == "/" {
        Operand::Div
    } else if operand == "*" {
        Operand::Mul
    } else {
        return Err(Error::ParseError);
    };

    let right = terms.next().ok_or(Error::ParseError)?;

    let right_term = if right == "ans" {
        Term::Ans
    } else {
        Term::F64(right.parse::<f64>().map_err(|_| Error::ParseError)?)
    };

    Ok(ParseResult::Expression(Box::new(Expression {
        left: left_term,
        op: operand,
        right: right_term,
    })))
}

fn encrypt_term(runtime: &Runtime, public_key: &PublicKey, input: Term) -> Term {
    match input {
        Term::Ans => Term::Ans,
        Term::F64(v) => Term::Encrypted(
            runtime
                .encrypt(Rational::try_from(v).unwrap(), public_key)
                .unwrap(),
        ),
        _ => {
            panic!("This shouldn't happen.");
        }
    }
}

fn alice(
    send_pub: Sender<PublicKey>,
    send_calc: Sender<Expression>,
    recv_params: Receiver<Params>,
    recv_res: Receiver<Ciphertext>,
) -> JoinHandle<()> {
    thread::spawn(move || {
        let stdin = io::stdin();
        let mut stdout = io::stdout();

        println!("Bob's private calculator. Type `help` for help.");

        // Bob needs to send us the scheme parameters compatible with his FHE program.
        let params = recv_params.recv().unwrap();

        let runtime = Runtime::new(&params).unwrap();

        let (public_key, private_key) = runtime.generate_keys().unwrap();

        // Send Bob a copy of our public keys.
        send_pub.send(public_key.clone()).unwrap();

        loop {
            print!(">> ");

            stdout.flush().unwrap();

            let mut line = String::new();
            stdin.read_line(&mut line).unwrap();
            let line = line.trim();

            // Read the line and parse it into operands and an operator.
            let parsed = parse_input(line);

            let Expression { left, right, op } = match parsed {
                Ok(ParseResult::Expression(val)) => *val,
                Ok(ParseResult::Exit) => std::process::exit(0),
                Ok(ParseResult::Help) => {
                    help();
                    continue;
                }
                Err(_) => {
                    println!("Parse error. Try again.");
                    continue;
                }
            };

            // Encrypt the left and right terms.
            let encrypt_left = encrypt_term(&runtime, &public_key, left);
            let encrypt_right = encrypt_term(&runtime, &public_key, right);

            // Send Bob our encrypted operation.
            send_calc
                .send(Expression {
                    left: encrypt_left,
                    right: encrypt_right,
                    op,
                })
                .unwrap();

            // Get our result from Bob and print it.
            let result: Ciphertext = recv_res.recv().unwrap();
            let result: Rational = match runtime.decrypt(&result, &private_key) {
                Ok(v) => v,
                Err(RuntimeError::TooMuchNoise) => {
                    println!("Decryption failed: too much noise");
                    continue;
                }
                Err(e) => panic!("{:#?}", e),
            };
            let result: f64 = result.into();

            println!("{}", result);
        }
    })
}

fn compile_fhe_programs() -> Application {
    #[fhe_program(scheme = "bfv")]
    fn add(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a + b
    }

    #[fhe_program(scheme = "bfv")]
    fn sub(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a - b
    }

    #[fhe_program(scheme = "bfv")]
    fn mul(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a * b
    }

    #[fhe_program(scheme = "bfv")]
    fn div(a: Cipher<Rational>, b: Cipher<Rational>) -> Cipher<Rational> {
        a / b
    }

    // We compile all the programs together so they have compatible
    // scheme parameters
    Compiler::new()
        .fhe_program(add)
        .fhe_program(mul)
        .fhe_program(div)
        .fhe_program(sub)
        // We need to make the noise margin large enough so we can do a few repeated calculations.
        .additional_noise_budget(32)
        .plain_modulus_constraint(PlainModulusConstraint::Raw(1_000_000))
        .compile()
        .unwrap()
}

fn bob(
    recv_pub: Receiver<PublicKey>,
    recv_calc: Receiver<Expression>,
    send_params: Sender<Params>,
    send_res: Sender<Ciphertext>,
) -> JoinHandle<()> {
    thread::spawn(move || {
        let app = compile_fhe_programs();

        send_params.send(app.params().clone()).unwrap();

        let public_key = recv_pub.recv().unwrap();

        let runtime = Runtime::new(app.params()).unwrap();

        let mut ans = runtime
            .encrypt(Rational::try_from(0f64).unwrap(), &public_key)
            .unwrap();

        loop {
            let Expression { left, right, op } = recv_calc.recv().unwrap();

            let left = match left {
                Term::Ans => ans.clone(),
                Term::Encrypted(c) => c,
                _ => panic!("Alice sent us a plaintext!"),
            };

            let right = match right {
                Term::Ans => ans.clone(),
                Term::Encrypted(c) => c,
                _ => panic!("Alice sent us a plaintext!"),
            };

            let mut c = match op {
                Operand::Add => runtime
                    .run(
                        app.get_program("add").unwrap(),
                        vec![left, right],
                        &public_key,
                    )
                    .unwrap(),
                Operand::Sub => runtime
                    .run(
                        app.get_program("sub").unwrap(),
                        vec![left, right],
                        &public_key,
                    )
                    .unwrap(),
                Operand::Mul => runtime
                    .run(
                        app.get_program("mul").unwrap(),
                        vec![left, right],
                        &public_key,
                    )
                    .unwrap(),
                Operand::Div => runtime
                    .run(
                        app.get_program("div").unwrap(),
                        vec![left, right],
                        &public_key,
                    )
                    .unwrap(),
            };

            // Our FHE program produces a single value, so move the value out of the vector.
            let c = c.drain(0..).next().unwrap();
            ans = c.clone();

            send_res.send(c).unwrap();
        }
    })
}

fn main() {
    // A channel for Alice to send her public keys to Bob.
    let (send_alice_pub, receive_alice_pub) = std::sync::mpsc::channel::<PublicKey>();

    // A channel for Alice to send calculation requests to Bob.
    let (send_alice_calc, receive_alice_calc) = std::sync::mpsc::channel::<Expression>();

    // A channel for Bob to send scheme params to Alice
    let (send_bob_params, receive_bob_params) = std::sync::mpsc::channel::<Params>();

    // A channel for Bob to send calculation results to Alice.
    let (send_bob_result, receive_bob_result) = std::sync::mpsc::channel::<Ciphertext>();

    // We intentionally break Alice and Bob's roles into different functions to clearly
    // show the separation of their roles. In a real application, they're usually on
    // different machines communicating over a real protocol (e.g. TCP sockets).
    let a = alice(
        send_alice_pub,
        send_alice_calc,
        receive_bob_params,
        receive_bob_result,
    );
    let b = bob(
        receive_alice_pub,
        receive_alice_calc,
        send_bob_params,
        send_bob_result,
    );

    a.join().unwrap();
    b.join().unwrap();
}
