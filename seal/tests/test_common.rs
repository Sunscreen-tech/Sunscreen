use seal::*;

pub fn run_bfv_test<F>(lane_bits: u32, degree: u64, test: F)
where
    F: FnOnce(Decryptor, BFVEncoder, Encryptor, BFVEvaluator, KeyGenerator),
{
    let params = BfvEncryptionParametersBuilder::new()
        .set_poly_modulus_degree(degree)
        .set_coefficient_modulus(
            CoefficientModulus::bfv_default(degree, SecurityLevel::TC128).unwrap(),
        )
        .set_plain_modulus(PlainModulus::batching(degree, lane_bits).unwrap())
        .build()
        .unwrap();

    let ctx = Context::new(&params, false, SecurityLevel::TC128).unwrap();
    let gen = KeyGenerator::new(&ctx).unwrap();

    let encoder = BFVEncoder::new(&ctx).unwrap();

    let public_key = gen.create_public_key();
    let private_key = gen.secret_key();

    let encryptor = Encryptor::with_public_and_secret_key(&ctx, &public_key, &private_key).unwrap();
    let decryptor = Decryptor::new(&ctx, &private_key).unwrap();
    let evaluator = BFVEvaluator::new(&ctx).unwrap();

    test(decryptor, encoder, encryptor, evaluator, gen);
}
