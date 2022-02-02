use comfy_table::{Cell, Row, Table};
use seal::*;

use crate::bibytes1;
use crate::POLY_DEGREE;

pub fn key_size_table() -> Table {
    let mut table = Table::new();
    let mut header = Row::new();

    header.add_cell(Cell::from("Poly degree"));

    for i in POLY_DEGREE {
        header.add_cell(Cell::from(i));
    }

    table.set_header(header);

    table.add_row(private_key_size());
    table.add_row(public_key_size());
    table.add_row(compact_public_key_size());
    table.add_row(relin_key_size());
    table.add_row(compact_relin_key_size());
    table.add_row(galois_key_size());
    table.add_row(compact_galois_key_size());

    table
}

fn private_key_size() -> Row {
    let mut row = Row::new();

    row.add_cell(Cell::from("private key"));

    for d in POLY_DEGREE {
        let d = *d;
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(d)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(d, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus_u64(1_000_000)
            .build()
            .unwrap();

        let context = Context::new(&params, false, SecurityLevel::default()).unwrap();

        let gen = KeyGenerator::new(&context).unwrap();

        let private = gen.secret_key();

        row.add_cell(Cell::from(bibytes1(
            private.as_bytes().unwrap().len() as f64
        )));
    }

    row
}

fn public_key_size() -> Row {
    let mut row = Row::new();

    row.add_cell(Cell::from("public key"));

    for d in POLY_DEGREE {
        let d = *d;

        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(d)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(d, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus_u64(1_000_000)
            .build()
            .unwrap();

        let context = Context::new(&params, false, SecurityLevel::default()).unwrap();

        let gen = KeyGenerator::new(&context).unwrap();

        let public = gen.create_public_key();

        row.add_cell(Cell::from(
            bibytes1(public.as_bytes().unwrap().len() as f64),
        ));
    }

    row
}

fn compact_public_key_size() -> Row {
    let mut row = Row::new();
    row.add_cell(Cell::from("compact public key"));

    for d in POLY_DEGREE {
        let d = *d;

        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(d)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(d, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus_u64(1_000_000)
            .build()
            .unwrap();

        let context = Context::new(&params, false, SecurityLevel::default()).unwrap();

        let gen = KeyGenerator::new(&context).unwrap();

        let public = gen.create_compact_public_key();

        row.add_cell(Cell::from(
            bibytes1(public.as_bytes().unwrap().len() as f64),
        ));
    }

    row
}

fn relin_key_size() -> Row {
    let mut row = Row::new();
    row.add_cell(Cell::from("relin keys"));

    for d in POLY_DEGREE {
        let d = *d;

        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(d)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(d, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus_u64(1_000_000)
            .build()
            .unwrap();

        let context = Context::new(&params, false, SecurityLevel::default()).unwrap();

        let gen = KeyGenerator::new(&context).unwrap();

        let relin = match gen.create_relinearization_keys() {
            Ok(r) => r,
            Err(_) => {
                row.add_cell(Cell::from("N/A"));
                continue;
            }
        };
        row.add_cell(Cell::from(bibytes1(relin.as_bytes().unwrap().len() as f64)));
    }

    row
}

fn compact_relin_key_size() -> Row {
    let mut row = Row::new();
    row.add_cell(Cell::from("compact relin keys"));

    for d in POLY_DEGREE {
        let d = *d;

        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(d)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(d, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus_u64(1_000_000)
            .build()
            .unwrap();

        let context = Context::new(&params, false, SecurityLevel::default()).unwrap();

        let gen = KeyGenerator::new(&context).unwrap();

        let relin = match gen.create_compact_relinearization_keys() {
            Ok(r) => r,
            Err(_) => {
                row.add_cell(Cell::from("N/A"));
                continue;
            }
        };

        row.add_cell(Cell::from(bibytes1(relin.as_bytes().unwrap().len() as f64)));
    }

    row
}

fn galois_key_size() -> Row {
    let mut row = Row::new();
    row.add_cell(Cell::from("Galois keys"));

    for d in POLY_DEGREE {
        let d = *d;

        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(d)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(d, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus(PlainModulus::batching(d, 20).unwrap())
            .build()
            .unwrap();

        let context = Context::new(&params, false, SecurityLevel::default()).unwrap();

        let gen = KeyGenerator::new(&context).unwrap();

        let galois = match gen.create_galois_keys() {
            Ok(g) => g,
            Err(_) => {
                row.add_cell(Cell::from("N/A"));
                continue;
            }
        };

        row.add_cell(Cell::from(
            bibytes1(galois.as_bytes().unwrap().len() as f64),
        ));
    }

    row
}

fn compact_galois_key_size() -> Row {
    let mut row = Row::new();
    row.add_cell(Cell::from("compact Galois keys"));

    for d in POLY_DEGREE {
        let d = *d;

        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(d)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(d, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus_u64(1_000_000)
            .build()
            .unwrap();

        let context = Context::new(&params, false, SecurityLevel::default()).unwrap();

        let gen = KeyGenerator::new(&context).unwrap();

        let galois = match gen.create_compact_galois_keys() {
            Ok(g) => g,
            Err(_) => {
                row.add_cell(Cell::from("N/A"));
                continue;
            }
        };
        row.add_cell(Cell::from(
            bibytes1(galois.as_bytes().unwrap().len() as f64),
        ));
    }

    row
}
