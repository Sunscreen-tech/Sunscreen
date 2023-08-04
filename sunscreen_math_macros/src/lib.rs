use darling::FromDeriveInput;
use num::{BigInt, FromPrimitive, Num};
use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[derive(FromDeriveInput, Debug)]
#[darling(attributes(barrett_config), forward_attrs(allow, doc, cfg))]
struct Opts {
    modulus: String,
    num_limbs: usize,
}

fn get_modulus(m: &str) -> Result<BigInt, String> {
    let result = if m.starts_with("0x") {
        let (_, hex) = m.split_at(2);

        BigInt::from_str_radix(hex, 16)
            .map_err(|_| "Failed to parse modulus as hexadecimal value".to_owned())?
    } else {
        BigInt::from_str_radix(m, 10)
            .map_err(|_| "Failed to parse modulus as decimal value".to_owned())?
    };

    Ok(result)
}

fn emit_limbs(x: &BigInt, num_limbs: usize) -> TokenStream2 {
    let limbs = x.to_u64_digits().1;

    assert!(limbs.len() <= num_limbs);

    let mut full_limbs = vec![0; num_limbs];

    full_limbs[..limbs.len()].copy_from_slice(&limbs[..]);
    
    let limbs = full_limbs.iter().map(|x| quote! {#x}).collect::<Vec<_>>();

    quote! {
        [ #(#limbs,)* ]
    }
}

#[proc_macro_derive(BarrettConfig, attributes(barrett_config))]
pub fn derive_barrett_config(input: proc_macro::TokenStream) -> TokenStream {
    let input = parse_macro_input!(input);
    let opts = Opts::from_derive_input(&input);

    let Opts { num_limbs, modulus } = if opts.is_err() {
        return quote! {compile_error!("You must specify #[barret_config(modulus = \"1234\", num_limbs = 2)]. Modulus requires either a hex value beginning in '0x' or decimal value. Limbs must be a positive an integer.")}.into();
    } else {
        opts.unwrap()
    };

    let modulus = match get_modulus(&modulus) {
        Err(s) => return quote! { compile_error!(#s) }.into(),
        Ok(m) => m,
    };

    let DeriveInput { ident, .. } = input;

    let mut max_limbs = vec![0u64; num_limbs];
    max_limbs[num_limbs - 1] = 0x1 << 63;

    let max_modulus = BigInt::from_slice(num::bigint::Sign::Plus, bytemuck::cast_slice(&max_limbs));

    if modulus > max_modulus {
        let err = format!("Chosen modulus {modulus} exceeds maximum ({max_modulus}) for given limb count {num_limbs}. Either increase the limb count or use a different backend for Fq.");

        return quote! { compile_error!(#err) }.into();
    }

    let one = BigInt::from_u64(1).unwrap();

    let r = (&one << (64 * num_limbs)) / &modulus;
    let s = (&one << (128 * num_limbs)) / &modulus - (&one << (64 * num_limbs)) * &r;
    let t = (&one << (64 * num_limbs)) - &r * &modulus;

    let mod_limbs = emit_limbs(&modulus, num_limbs);
    let r_limbs = emit_limbs(&r, num_limbs);
    let s_limbs = emit_limbs(&s, num_limbs);
    let t_limbs = emit_limbs(&t, num_limbs);

    let sunscreen_path = quote! { sunscreen_math::ring };

    quote! {
        impl #sunscreen_path::BarrettConfig<#num_limbs> for #ident {
            const MODULUS: #sunscreen_path::Uint<#num_limbs> = #sunscreen_path::Uint::from_words(#mod_limbs);
            const R: #sunscreen_path::Uint<#num_limbs> = #sunscreen_path::Uint::from_words(#r_limbs);
            const S: #sunscreen_path::Uint<#num_limbs> = #sunscreen_path::Uint::from_words(#s_limbs);
            const T: #sunscreen_path::Uint<#num_limbs> = #sunscreen_path::Uint::from_words(#t_limbs);
        }
    }.into()
}
