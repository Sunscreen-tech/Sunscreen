use proc_macro2::{Span, TokenStream as TokenStream2};
use quote::{format_ident, quote, quote_spanned};
use syn::{punctuated::Punctuated, spanned::Spanned, FnArg, Ident, Pat, PatType, Token, Type};

/**
 * Given an input type T, returns
 * * FheProgramInput<T> when T is a Path
 * * [map_input_type(T); N] when T is Array
 */
pub fn map_input_type(arg_type: &Type) -> TokenStream2 {
    match arg_type {
        Type::Path(ty) => quote_spanned! { ty.span() => FheProgramNode<#ty> },
        Type::Array(a) => {
            let inner_type = map_input_type(&a.elem);
            let len = &a.len;

            quote_spanned! { a.span() =>
                [#inner_type; #len]
            }
        }
        _ => quote! {
            compile_error!("fhe_program arguments' name must be a simple identifier and type must be a plain path.");
        },
    }
}

/**
 * Emits code to make an FHE program node for the given
 * type T.
 */
pub fn create_fhe_program_node(var_name: &str, arg_type: &Type) -> TokenStream2 {
    let mapped_type = map_input_type(arg_type);
    let var_name = format_ident!("{}", var_name);

    let type_annotation = match arg_type {
        Type::Path(ty) => quote_spanned! { ty.span() => FheProgramNode },
        Type::Array(a) => quote_spanned! { a.span() =>
            <#mapped_type>
        },
        _ => quote! {
            compile_error!("fhe_program arguments' name must be a simple identifier and type must be a plain path.");
        },
    };

    quote_spanned! {arg_type.span() =>
        let #var_name: #mapped_type = #type_annotation::input();
    }
}

pub enum ExtractFnArgumentsError {
    ContainsSelf,
    IllegalType(Span),
}

pub fn extract_fn_arguments(
    args: &Punctuated<FnArg, Token!(,)>,
) -> Result<Vec<(&PatType, &Ident)>, ExtractFnArgumentsError> {
    let mut unwrapped_inputs = vec![];

    for i in args {
        let input_type = match i {
            FnArg::Receiver(_) => {
                return Err(ExtractFnArgumentsError::ContainsSelf);
            }
            FnArg::Typed(t) => match (&*t.ty, &*t.pat) {
                (Type::Path(_), Pat::Ident(i)) => (t, &i.ident),
                (Type::Array(_), Pat::Ident(i)) => (t, &i.ident),
                _ => {
                    return Err(ExtractFnArgumentsError::IllegalType(i.span()));
                }
            },
        };

        unwrapped_inputs.push(input_type);
    }

    Ok(unwrapped_inputs)
}

#[cfg(test)]
mod test {
    use super::*;
    use syn::parse_quote;

    fn assert_token_stream_eq(a: &TokenStream2, b: &TokenStream2) {
        assert_eq!(format!("{}", a), format!("{}", b));
    }

    #[test]
    fn transform_plain_scalar_type() {
        let type_name = quote! {
            Rational
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = map_input_type(&type_name);

        let expected = quote! {
            FheProgramNode<Rational>
        };

        assert_token_stream_eq(&actual, &expected);
    }

    #[test]
    fn transform_array_type() {
        let type_name = quote! {
            [Rational; 6]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = map_input_type(&type_name);

        let expected = quote! {
            [FheProgramNode<Rational>; 6]
        };

        assert_token_stream_eq(&actual, &expected);
    }

    #[test]
    fn transform_multi_dimensional_array_type() {
        let type_name = quote! {
            [[Rational; 6]; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = map_input_type(&type_name);

        let expected = quote! {
            [[FheProgramNode<Rational>; 6]; 7]
        };

        assert_token_stream_eq(&actual, &expected);
    }

    #[test]
    fn transform_multi_dimensional_array_cipher_type() {
        let type_name = quote! {
            [[Cipher<Rational>; 6]; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = map_input_type(&type_name);

        let expected = quote! {
            [[FheProgramNode<Cipher<Rational> >; 6]; 7]
        };

        assert_token_stream_eq(&actual, &expected);
    }

    #[test]
    fn can_create_simple_fhe_program_node() {
        let type_name = quote! {
            Cipher<Rational>
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_fhe_program_node("horse", &type_name);

        let expected = quote! {
            let horse: FheProgramNode<Cipher<Rational> > = FheProgramNode::input();
        };

        assert_token_stream_eq(&actual, &expected);
    }

    #[test]
    fn can_create_array_program_node() {
        let type_name = quote! {
            [Cipher<Rational>; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_fhe_program_node("horse", &type_name);

        let expected = quote! {
            let horse: [FheProgramNode<Cipher<Rational> >; 7] = <[FheProgramNode<Cipher<Rational> >; 7]>::input();
        };

        assert_token_stream_eq(&actual, &expected);
    }

    #[test]
    fn can_create_multidimensional_array_program_node() {
        let type_name = quote! {
            [[Cipher<Rational>; 7]; 6]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_fhe_program_node("horse", &type_name);

        let expected = quote! {
            let horse: [[FheProgramNode<Cipher<Rational> >; 7]; 6] = <[[FheProgramNode<Cipher<Rational> >; 7]; 6]>::input();
        };

        assert_token_stream_eq(&actual, &expected);
    }
}
