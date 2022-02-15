use comfy_table::{Cell, Row, Table};
use seal::*;

use crate::bibytes1;
use crate::POLY_DEGREE;

pub fn texts_table() -> Table {
    let mut table = Table::new();
    let mut header = Row::new();

    header.add_cell(Cell::from("Poly degree"));

    for i in POLY_DEGREE {
        header.add_cell(Cell::from(i));
    }

    table.set_header(header);

    table.add_row(ciphertext());

    table
}

fn ciphertext() -> Row {
    let mut row = Row::new();

    row.add_cell(Cell::from("private key"));

    for d in POLY_DEGREE {
        let d = *d;
        let params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(d)
            .set_coefficient_modulus(
                CoefficientModulus::bfv_default(d, SecurityLevel::default()).unwrap(),
            )
            .set_plain_modulus_u64(64)
            .build()
            .unwrap();

        let context = Context::new(&params, false, SecurityLevel::default()).unwrap();

        let gen = KeyGenerator::new(&context).unwrap();

        let public_key = gen.create_public_key();

        let encryptor = Encryptor::with_public_key(&context, &public_key).unwrap();
        let plaintext = Plaintext::from_hex_string("0").unwrap();
        let ciphertext = encryptor.encrypt(&plaintext).unwrap();

        row.add_cell(Cell::from(bibytes1(
            ciphertext.as_bytes().unwrap().len() as f64
        )));
    }

    row
}
