use proc_macro2::{Span, TokenStream as TokenStream2};
use quote::{format_ident, quote, quote_spanned, ToTokens};
use syn::{
    parse_quote, parse_quote_spanned, punctuated::Punctuated, spanned::Spanned, token::PathSep,
    AngleBracketedGenericArguments, Attribute, FnArg, Ident, Index, Pat, PatIdent, PathArguments,
    ReturnType, Token, Type,
};

mod type_name;

pub use type_name::derive_typename_impl;

#[derive(Debug)]
/**
 * A type error that occurs in a program specification.
 */
pub enum ProgramTypeError {
    /**
     * The given type is illegal.
     */
    IllegalType(Span),
}

/**
 * Given an input type T, returns
 * * `ProgramNode<T>` when T is a Path
 * * [map_input_type(T); N] when T is Array
 */
pub fn lift_type(arg_type: &Type) -> Result<Type, ProgramTypeError> {
    let transformed_type = match arg_type {
        Type::Path(ty) => parse_quote_spanned! {ty.span() => ProgramNode<#ty> },
        Type::Array(a) => {
            let inner_type = lift_type(&a.elem)?;
            let len = &a.len;

            parse_quote_spanned! {a.span() =>
                [#inner_type; #len]
            }
        }
        _ => {
            return Err(ProgramTypeError::IllegalType(arg_type.span()));
        }
    };

    Ok(transformed_type)
}

/**
 * Emits code to make a program node for the given type T.
 */
pub fn create_program_node(
    var_name: &str,
    arg_type: &Type,
    input_method: &str,
    input_arg: Option<&Ident>,
) -> TokenStream2 {
    let mapped_type = match lift_type(arg_type) {
        Ok(v) => v,
        Err(ProgramTypeError::IllegalType(s)) => {
            return quote_spanned! {
                s => compile_error!("Unsupported program input type.")
            };
        }
    };
    let var_name = format_ident!("{}", var_name);
    let input_method = format_ident!("{}", input_method);

    let type_annotation = match arg_type {
        Type::Path(ty) => quote_spanned! { ty.span() => ProgramNode },
        Type::Array(a) => quote_spanned! { a.span() =>
            <#mapped_type>
        },
        _ => quote! {
            compile_error!("fhe_program arguments' name must be a simple identifier and type must be a plain path.");
        },
    };

    quote_spanned! {arg_type.span() =>
        let #var_name: #mapped_type = #type_annotation::#input_method(#input_arg);
    }
}

#[derive(Debug)]
/**
 * Errors that can occur when extracting the function signature of a
 * program.
 */
pub enum ExtractFnArgumentsError {
    /**
     * The method contains a reference to `self` or `&self`.
     *
     * # Remarks
     * FHE and ZKP programs must be pure functions.
     */
    ContainsSelf(Span),

    /**
     * The method specifies a mutable argument.
     *
     * # Remarks
     * FHE and ZKP programs must be pure functions.
     */
    ContainsMut(Span),

    /**
     * The given type is not allowed.
     */
    IllegalType(Span),

    /**
     * The given type pattern is not a qualified path to a type.
     */
    IllegalPat(Span),
}

/**
 * The attribute, type, and identifier information for a function
 * argument.
 */
pub type FnArgInfo<'a> = (Vec<Attribute>, &'a Type, &'a Ident);

/**
 * Validate and parse the arguments of a function, returning a Vec of
 * the types and identifiers.
 */
pub fn extract_fn_arguments(
    args: &Punctuated<FnArg, Token!(,)>,
) -> Result<Vec<FnArgInfo<'_>>, ExtractFnArgumentsError> {
    let mut unwrapped_inputs = vec![];

    for i in args {
        let input_type = match i {
            FnArg::Receiver(_) => {
                return Err(ExtractFnArgumentsError::ContainsSelf(i.span()));
            }
            FnArg::Typed(t) => match &*t.pat {
                Pat::Ident(PatIdent {
                    mutability: Some(m),
                    ..
                }) => {
                    return Err(ExtractFnArgumentsError::ContainsMut(m.span()));
                }
                Pat::Ident(i) => match *t.ty {
                    Type::Path(_) | Type::Array(_) => (t.attrs.clone(), &*t.ty, &i.ident),
                    _ => return Err(ExtractFnArgumentsError::IllegalType(t.span())),
                },
                _ => return Err(ExtractFnArgumentsError::IllegalPat(t.span())),
            },
        };

        unwrapped_inputs.push(input_type);
    }

    Ok(unwrapped_inputs)
}

#[derive(Debug)]
/**
 * Errors that can occur when extracting the return value of an FHE
 * program.
 */
pub enum ExtractReturnTypesError {
    /**
     * The given return type is not allowed.
     *
     * # Remarks
     * ZKP programs don't return values.
     *
     * FHE programs must return either
     * * nothing (weird, but legal).
     * * a single FHE type.
     * * a tuple of FHE types.
     *
     */
    IllegalType(Span),
}

impl From<ProgramTypeError> for ExtractReturnTypesError {
    fn from(e: ProgramTypeError) -> Self {
        match e {
            ProgramTypeError::IllegalType(s) => Self::IllegalType(s),
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

/**
 * Emits code to create output nodes for each returned value in an
 * FHE program.
 */
pub fn emit_output_capture(return_types: &[Type]) -> TokenStream2 {
    match return_types.len() {
        1 => quote_spanned! { return_types[0].span() => v.output(); },
        _ => return_types
            .iter()
            .enumerate()
            .map(|(i, t)| {
                let index = Index::from(i);

                quote_spanned! {t.span() =>
                    v.#index.output();
                }
            })
            .collect(),
    }
}

/**
 * For a given type, inserts colons between each segment and generic
 * argument. The returned token stream can be used for function
 * invocations.
 *
 * # Example
 * `foo::bar::<7>::Baz<Kitty>` becomes `foo::bar::<7>::Baz::<Kitty>`.
 *
 * With the former, you cannot do `foo::bar::<7>::Baz<Kitty>::my_func()`,
 * the the latter you can do `foo::bar::<7>::Baz::<Kitty>::my_func()`.
 */
pub fn normalize_type_generic_args(t: &Type) -> Punctuated<TokenStream2, PathSep> {
    let mut ret = Punctuated::new();

    match t {
        Type::Path(p) => {
            for s in &p.path.segments {
                ret.push(s.ident.clone().into_token_stream());

                if let PathArguments::AngleBracketed(a) = &s.arguments {
                    let args = AngleBracketedGenericArguments {
                        colon2_token: None,
                        ..a.clone()
                    };

                    ret.push(args.into_token_stream());
                }
            }
        }
        Type::Array(a) => {
            ret.push(a.into_token_stream());
        }
        _ => unimplemented!(),
    }

    ret
}

/**
 * Emits the call signature of an FHE or ZKP program.
 */
pub fn emit_signature(args: &[Type], return_types: &[Type]) -> TokenStream2 {
    let arg_get_types = args.iter().map(|x| {
        let x = normalize_type_generic_args(x);

        quote! {
            <#x>::type_name(),
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
            <#alias>::type_name(),
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

        let actual = lift_type(&type_name).unwrap();

        let expected: Type = parse_quote! {
            ProgramNode<Rational>
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn transform_array_type() {
        let type_name = quote! {
            [Rational; 6]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = lift_type(&type_name).unwrap();

        let expected: Type = parse_quote! {
            [ProgramNode<Rational>; 6]
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn transform_multi_dimensional_array_type() {
        let type_name = quote! {
            [[Rational; 6]; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = lift_type(&type_name).unwrap();

        let expected: Type = parse_quote! {
            [[ProgramNode<Rational>; 6]; 7]
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn transform_multi_dimensional_array_cipher_type() {
        let type_name = quote! {
            [[Cipher<Rational>; 6]; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = lift_type(&type_name).unwrap();

        let expected: Type = parse_quote! {
            [[ProgramNode<Cipher<Rational> >; 6]; 7]
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_create_simple_fhe_program_node() {
        let type_name = quote! {
            Cipher<Rational>
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_program_node("horse", &type_name, "input", None);

        let expected = quote! {
            let horse: ProgramNode<Cipher<Rational> > = ProgramNode::input();
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_rename_program_input() {
        let type_name = quote! {
            Cipher<Rational>
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_program_node("horse", &type_name, "doggie", None);

        let expected = quote! {
            let horse: ProgramNode<Cipher<Rational> > = ProgramNode::doggie();
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_pass_args_to_input() {
        let type_name = quote! {
            BfvPlaintext<Signed>
        };
        let arg = format_ident!("shared_input");

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_program_node("pt", &type_name, "shared_input", Some(&arg));

        let expected = quote! {
            let pt: ProgramNode<BfvPlaintext<Signed> > = ProgramNode::shared_input(shared_input);
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_create_array_program_node() {
        let type_name = quote! {
            [Cipher<Rational>; 7]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_program_node("horse", &type_name, "input", None);

        let expected = quote! {
            let horse: [ProgramNode<Cipher<Rational> >; 7] = <[ProgramNode<Cipher<Rational> >; 7]>::input();
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_create_multidimensional_array_program_node() {
        let type_name = quote! {
            [[Cipher<Rational>; 7]; 6]
        };

        let type_name: Type = parse_quote!(#type_name);

        let actual = create_program_node("horse", &type_name, "input", None);

        let expected = quote! {
            let horse: [[ProgramNode<Cipher<Rational> >; 7]; 6] = <[[ProgramNode<Cipher<Rational> >; 7]; 6]>::input();
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn can_extract_arguments() {
        let type_name = quote! {
            a: [[Cipher<Rational>; 7]; 6], b: Cipher<Rational>
        };

        let args: Punctuated<FnArg, Token!(,)> = parse_quote!(#type_name);

        let extracted = extract_fn_arguments(&args).unwrap();

        let expected_t0: Type = parse_quote! { [[Cipher<Rational>; 7]; 6] };
        let expected_t1: Type = parse_quote! { Cipher<Rational> };
        let expected_i0: Ident = parse_quote! { a };
        let expected_i1: Ident = parse_quote! { b };

        assert_eq!(extracted.len(), 2);
        assert_syn_eq(extracted[0].1, &expected_t0);
        assert_syn_eq(extracted[0].2, &expected_i0);
        assert_syn_eq(extracted[1].1, &expected_t1);
        assert_syn_eq(extracted[1].2, &expected_i1);
    }

    #[test]
    fn can_extract_argument_attributes() {
        let type_name = quote! {
            #[public] a: [[Cipher<Rational>; 7]; 6], #[constant] b: Cipher<Rational>
        };

        let args: Punctuated<FnArg, Token!(,)> = parse_quote!(#type_name);

        let extracted = extract_fn_arguments(&args).unwrap();

        let expected_a0: Attribute = parse_quote! { #[public] };
        let expected_a1: Attribute = parse_quote! { #[constant] };
        let expected_t0: Type = parse_quote! { [[Cipher<Rational>; 7]; 6] };
        let expected_t1: Type = parse_quote! { Cipher<Rational> };
        let expected_i0: Ident = parse_quote! { a };
        let expected_i1: Ident = parse_quote! { b };

        assert_eq!(extracted.len(), 2);
        assert_syn_eq(&extracted[0].0[0], &expected_a0);
        assert_syn_eq(extracted[0].1, &expected_t0);
        assert_syn_eq(extracted[0].2, &expected_i0);
        assert_syn_eq(&extracted[1].0[0], &expected_a1);
        assert_syn_eq(extracted[1].1, &expected_t1);
        assert_syn_eq(extracted[1].2, &expected_i1);
    }

    #[test]
    fn disallows_self_arguments() {
        let type_name = quote! {
            &self, a: [[Cipher<Rational>; 7]; 6], b: Cipher<Rational>
        };

        let args: Punctuated<FnArg, Token!(,)> = parse_quote!(#type_name);

        let extracted = extract_fn_arguments(&args);

        match extracted {
            Err(ExtractFnArgumentsError::ContainsSelf(_)) => {}
            _ => {
                panic!("Expected ExtractFnArgumentsError::ContainsSelf");
            }
        };
    }

    #[test]
    fn disallows_mut_arguments() {
        let type_name = quote! {
            mut a: [[Cipher<Rational>; 7]; 6], b: Cipher<Rational>
        };

        let args: Punctuated<FnArg, Token!(,)> = parse_quote!(#type_name);

        let extracted = extract_fn_arguments(&args);

        match extracted {
            Err(ExtractFnArgumentsError::ContainsMut(_)) => {}
            _ => {
                panic!("Expected ExtractFnArgumentsError::ContainsMut");
            }
        };
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
            v.output();
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
            v.0.output();
            v.1.output();
        };

        assert_syn_eq(&actual, &expected);
    }

    #[test]
    fn generic_invocation_works() {
        let in_type: Type = parse_quote!(kitty::cow::<7>::MyType<Foo>);

        let actual = normalize_type_generic_args(&in_type);

        let expected = quote! {
            kitty::cow::<7>::MyType::<Foo>
        };

        assert_syn_eq(&actual, &expected);
    }
}
