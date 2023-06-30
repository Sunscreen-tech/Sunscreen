use proc_macro2::{Span, TokenStream as TokenStream2};
use quote::{format_ident, quote, quote_spanned};
use syn::{parse_quote, parse_quote_spanned, spanned::Spanned, Index, ReturnType, Type};

#[derive(Debug)]
pub enum MapFheTypeError {
    IllegalType(Span),
}

/**
 * Given an input type T, returns
 * * FheProgramNode<T> when T is a Path
 * * [FheProgramNode<T>; N] when T is Array
 */
pub fn map_fhe_type(arg_type: &Type) -> Result<Type, MapFheTypeError> {
    let transformed_type = match arg_type {
        Type::Path(ty) => parse_quote_spanned! {ty.span() => FheProgramNode<#ty> },
        Type::Array(a) => {
            let inner_type = map_fhe_type(&a.elem)?;
            let len = &a.len;

            parse_quote_spanned! {a.span() =>
                [#inner_type; #len]
            }
        }
        _ => {
            return Err(MapFheTypeError::IllegalType(arg_type.span()));
        }
    };

    Ok(transformed_type)
}

/**
 * Emits code to make an FHE program node for the given
 * type T.
 */
pub fn create_fhe_program_node(var_name: &str, arg_type: &Type) -> TokenStream2 {
    let mapped_type = match map_fhe_type(arg_type) {
        Ok(v) => v,
        Err(MapFheTypeError::IllegalType(s)) => {
            return quote_spanned! {
                s => compile_error!("FHE program arguments must ")
            };
        }
    };

    let var_name = format_ident!("{}", var_name);

    quote_spanned! {arg_type.span() =>

        let #var_name: #mapped_type = <#mapped_type as Input>::input();
    }
}

#[derive(Debug)]
pub enum ExtractReturnTypesError {
    IllegalType(Span),
}

impl From<MapFheTypeError> for ExtractReturnTypesError {
    fn from(e: MapFheTypeError) -> Self {
        match e {
            MapFheTypeError::IllegalType(s) => Self::IllegalType(s),
        }
    }
}

/**
 * Unpacks the return types from a `ReturnType` and flattens them
 * into a Vec.
 * * Tuples will have more than one.
 * * Path, Paren, and Arrays will have one.
 * * Default has zero.
 */
pub fn extract_return_types(ret: &ReturnType) -> Result<Vec<Type>, ExtractReturnTypesError> {
    let return_types = match ret {
        ReturnType::Type(_, t) => match &**t {
            Type::Tuple(t) => t.elems.iter().cloned().collect::<Vec<Type>>(),
            Type::Paren(t) => {
                vec![*t.elem.clone()]
            }
            Type::Path(_) => {
                vec![*t.clone()]
            }
            Type::Array(_) => {
                vec![*t.clone()]
            }
            _ => return Err(ExtractReturnTypesError::IllegalType(t.span())),
        },
        ReturnType::Default => {
            vec![]
        }
    };

    Ok(return_types)
}

/**
 * Takes an array of return types and packages them into a tuple
 * if needed.
 */
pub fn pack_return_type(return_types: &[Type]) -> Type {
    match return_types.len() {
        0 => parse_quote! { () },
        1 => return_types[0].clone(),
        _ => {
            parse_quote_spanned! {return_types[0].span() => ( #(#return_types),* ) }
        }
    }
}

pub fn emit_output_capture(return_types: &[Type]) -> TokenStream2 {
    match return_types {
        [ty] => quote_spanned! { ty.span() => {
            struct _AssertOutput where FheProgramNode<#ty>: Output;
            v.output();
        }},
        _ => return_types
            .iter()
            .enumerate()
            .map(|(i, ty)| {
                let index = Index::from(i);

                quote_spanned! {ty.span() => {
                    struct _AssertOutput where FheProgramNode<#ty>: Output;
                    v.#index.output();
                }}
            })
            .collect(),
    }
}

pub fn emit_signature(args: &[Type], return_types: &[Type]) -> TokenStream2 {
    let arg_type_names = args
        .iter()
        .enumerate()
        .map(|(i, t)| {
            let alias = format_ident!("T{}", i);

            quote! {
                type #alias = #t;
            }
        })
        .collect::<Vec<TokenStream2>>();

    let arg_get_types = arg_type_names.iter().enumerate().map(|(i, _)| {
        let alias = format_ident!("T{}", i);

        quote! {
            #alias::type_name(),
        }
    });

    let return_type_aliases = return_types.iter().enumerate().map(|(i, t)| {
        let alias = format_ident!("R{}", i);

        quote! {
            type #alias = #t;
        }
    });

    let return_type_names = return_types.iter().enumerate().map(|(i, _)| {
        let alias = format_ident!("R{}", i);

        quote! {
            #alias ::type_name(),
        }
    });

    let return_type_sizes = return_types.iter().enumerate().map(|(i, _)| {
        let alias = format_ident!("R{}", i);

        quote! {
            #alias ::NUM_CIPHERTEXTS,
        }
    });

    quote! {
        use sunscreen::types::TypeName;

        #(#arg_type_names)*
        #(#return_type_aliases)*

        sunscreen::CallSignature {
            arguments: vec![#(#arg_get_types)*],
            returns: vec![#(#return_type_names)*],
            num_ciphertexts: vec![#(#return_type_sizes)*],
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use quote::ToTokens;
    use syn::parse_quote;

    fn assert_syn_eq<T, U>(a: &T, b: &U)
    where
        T: ToTokens,
        U: ToTokens,
    {
        assert_eq!(
            format!("{}", a.to_token_stream()),
            format!("{}", b.to_token_stream())
        );
    }

    fn assert_syn_slice_eq<T>(a: &[T], b: &[T])
    where
        T: ToTokens,
    {
        assert_eq!(a.len(), b.len());

        for (l, r) in a.iter().zip(b) {
            assert_syn_eq(l, r);
        }
    }

    #[test]
    fn transform_plain_scalar_type() {
        let type_name = quote! {
            Rational
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = map_fhe_type(&type_name).unwrap();

        let expected: Type = parse_quote! {
            FheProgramNode<Rational>
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn transform_array_type() {
        let type_name = quote! {
            [Rational; 6]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = map_fhe_type(&type_name).unwrap();

        let expected: Type = parse_quote! {
            [FheProgramNode<Rational>; 6]
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn transform_multi_dimensional_array_type() {
        let type_name = quote! {
            [[Rational; 6]; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = map_fhe_type(&type_name).unwrap();

        let expected: Type = parse_quote! {
            [[FheProgramNode<Rational>; 6]; 7]
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn transform_multi_dimensional_array_cipher_type() {
        let type_name = quote! {
            [[Cipher<Rational>; 6]; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = map_fhe_type(&type_name).unwrap();

        let expected: Type = parse_quote! {
            [[FheProgramNode<Cipher<Rational> >; 6]; 7]
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_create_simple_fhe_program_node() {
        let type_name = quote! {
            Cipher<Rational>
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_fhe_program_node("horse", &type_name);

        let expected = quote! {
            let horse: FheProgramNode<Cipher<Rational> > = <FheProgramNode<Cipher<Rational> > as Input>::input();
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_create_array_program_node() {
        let type_name = quote! {
            [Cipher<Rational>; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_fhe_program_node("horse", &type_name);

        let expected = quote! {
            let horse: [FheProgramNode<Cipher<Rational> >; 7] = <[FheProgramNode<Cipher<Rational> >; 7] as Input>::input();
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_create_multidimensional_array_program_node() {
        let type_name = quote! {
            [[Cipher<Rational>; 7]; 6]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_fhe_program_node("horse", &type_name);

        let expected = quote! {
            let horse: [[FheProgramNode<Cipher<Rational> >; 7]; 6] = <[[FheProgramNode<Cipher<Rational> >; 7]; 6] as Input>::input();
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_extract_no_return_type() {
        let return_type: Type = parse_quote! {
            ()
        };

        let return_type = ReturnType::Type(syn::token::RArrow::default(), Box::new(return_type));

        let extracted = extract_return_types(&return_type).unwrap();

        assert_syn_slice_eq(&extracted, &[]);
    }

    #[test]
    fn can_extract_single_return() {
        let return_type: Type = parse_quote! {
            Cipher<Signed>
        };

        let return_type = ReturnType::Type(syn::token::RArrow::default(), Box::new(return_type));

        let extracted = extract_return_types(&return_type).unwrap();

        assert_syn_slice_eq(&extracted, &[parse_quote! { Cipher<Signed> }]);
    }

    #[test]
    fn can_extract_single_paren_return() {
        let return_type: Type = parse_quote! {
            (Cipher<Signed>)
        };

        let return_type = ReturnType::Type(syn::token::RArrow::default(), Box::new(return_type));

        let extracted = extract_return_types(&return_type).unwrap();

        assert_syn_slice_eq(&extracted, &[parse_quote! { Cipher<Signed> }]);
    }

    #[test]
    fn can_extract_single_array_return() {
        let return_type: Type = parse_quote! {
            [[Cipher<Signed>; 6]; 7]
        };

        let return_type = ReturnType::Type(syn::token::RArrow::default(), Box::new(return_type));

        let extracted = extract_return_types(&return_type).unwrap();

        assert_syn_slice_eq(&extracted, &[parse_quote! { [[Cipher<Signed>; 6]; 7] }]);
    }

    #[test]
    fn can_extract_single_multiarray_return() {
        let return_type: Type = parse_quote! {
            ([[Cipher<Signed>; 6]; 7], Cipher<Signed>)
        };

        let return_type = ReturnType::Type(syn::token::RArrow::default(), Box::new(return_type));

        let extracted = extract_return_types(&return_type).unwrap();

        assert_syn_slice_eq(
            &extracted,
            &[
                parse_quote! { [[Cipher<Signed>; 6]; 7] },
                parse_quote! { Cipher<Signed> },
            ],
        );
    }

    #[test]
    fn can_capture_single_output() {
        let return_type: Type = parse_quote! {
            (Cipher<Signed>)
        };

        let return_type = ReturnType::Type(syn::token::RArrow::default(), Box::new(return_type));

        let extracted = extract_return_types(&return_type).unwrap();

        let actual = emit_output_capture(&extracted);

        let expected = quote! {
            {
                struct _AssertOutput where FheProgramNode< Cipher < Signed > > : Output;
                v.output();
            }
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_capture_multiple_outputs() {
        let return_type: Type = parse_quote! {
            (Cipher<Signed>, [[Cipher<Signed>; 6]; 7])
        };

        let return_type = ReturnType::Type(syn::token::RArrow::default(), Box::new(return_type));

        let extracted = extract_return_types(&return_type).unwrap();

        let actual = emit_output_capture(&extracted);

        let expected = quote! {
            {
                struct _AssertOutput where FheProgramNode< Cipher < Signed > > : Output;
                v.0.output();
            }
            {
                struct _AssertOutput where FheProgramNode<[[Cipher<Signed>; 6]; 7]>: Output;
                v.1.output();
            }
        };

        assert_syn_eq(&actual, &expected);
    }
}
