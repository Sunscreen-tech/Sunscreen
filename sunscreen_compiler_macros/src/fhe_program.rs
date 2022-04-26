use crate::{
    fhe_program_transforms::*,
    internals::{attr::Attrs, case::Scheme},
};
use proc_macro2::{Span, TokenStream};
use quote::{quote, quote_spanned};
use syn::{parse_macro_input, spanned::Spanned, Ident, Index, ItemFn, ReturnType, Type};

pub fn fhe_program_impl(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);

    let fhe_program_name = &input_fn.sig.ident;
    let vis = &input_fn.vis;
    let body = &input_fn.block;
    let inputs = &input_fn.sig.inputs;
    let ret = &input_fn.sig.output;

    let attr_params = parse_macro_input!(metadata as Attrs);

    let scheme_type = match attr_params.scheme {
        Scheme::Bfv => {
            quote! {
                sunscreen::SchemeType::Bfv
            }
        }
    };

    let unwrapped_inputs = match extract_fn_arguments(&inputs) {
        Ok(v) => v,
        Err(e) => {
            return proc_macro::TokenStream::from(match e {
                ExtractFnArgumentsError::ContainsSelf(s) => {
                    quote_spanned! {s => compile_error!("FHE programs must not contain `self`") }
                }
                ExtractFnArgumentsError::IllegalPat(s) => quote_spanned! {
                    s => compile_error! { "Expected Identifier" }
                },
                ExtractFnArgumentsError::IllegalType(s) => quote_spanned! {
                    s => compile_error! { "FHE program arguments must be an array or named type" }
                },
            });
        }
    };

    let signature = create_signature(
        &unwrapped_inputs
            .iter()
            .map(|t| &*t.0.ty)
            .collect::<Vec<&Type>>(),
        ret,
    );

    let fhe_program_args = unwrapped_inputs
        .iter()
        .map(|i| {
            let (ty, name) = i;
            let ty = map_input_type(&ty.ty);

            quote! {
                #name: #ty,
            }
        })
        .collect::<Vec<TokenStream>>();

    let catpured_outputs = capture_outputs(ret);
    let fhe_program_returns = lift_return_type(ret);

    let var_decl = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let var_name = format!("c_{}", i);

        create_fhe_program_node(&var_name, &t.0.ty)
    });

    let args = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());

        quote_spanned! {t.0.span() =>
            #id
        }
    });

    let fhe_program_struct_name =
        Ident::new(&format!("{}_struct", fhe_program_name), Span::call_site());

    let fhe_program = proc_macro::TokenStream::from(quote! {
        #[allow(non_camel_case_types)]
        #vis struct #fhe_program_struct_name {
        }

        impl sunscreen::FheProgramFn for #fhe_program_struct_name {
            fn build(&self, params: &sunscreen::Params) -> sunscreen::Result<sunscreen::FrontendCompilation> {
                use std::cell::RefCell;
                use std::mem::transmute;
                use sunscreen::{CURRENT_CTX, Context, Error, INDEX_ARENA, Result, Params, SchemeType, Value, types::{intern::{FheProgramNode, Input}, NumCiphertexts, Type, TypeName, SwapRows, LaneCount, TypeNameInstance}};

                if SchemeType::Bfv != params.scheme_type {
                    return Err(Error::IncorrectScheme)
                }

                // TODO: Other schemes.
                let mut context = Context::new(params);

                CURRENT_CTX.with(|ctx| {
                    #[forbid(unused_variables)]
                    let internal = | #(#fhe_program_args)* | -> #fhe_program_returns
                        #body
                    ;

                    // Transmute away the lifetime to 'static. So long as we are careful with internal()
                    // panicing, this is safe because we set the context back to none before the funtion
                    // returns.
                    ctx.swap(&RefCell::new(Some(unsafe { transmute(&mut context) })));

                    #(#var_decl)*

                    let panic_res = std::panic::catch_unwind(|| {
                        internal(#(#args),*)
                    });

                    // when panicing or not, we need to collect our indicies arena and
                    // unset the context reference.
                    match panic_res {
                        Ok(v) => { #catpured_outputs },
                        Err(err) => {
                            INDEX_ARENA.with(|allocator| {
                                allocator.borrow_mut().reset()
                            });
                            ctx.swap(&RefCell::new(None));
                            std::panic::resume_unwind(err)
                        }
                    };

                    INDEX_ARENA.with(|allocator| {
                        allocator.borrow_mut().reset()
                    });
                    ctx.swap(&RefCell::new(None));
                });

                Ok(context.compilation)
            }

            fn signature(&self) -> sunscreen::CallSignature {
                use sunscreen::types::NumCiphertexts;

                #signature
            }

            fn scheme_type(&self) -> sunscreen::SchemeType {
                #scheme_type
            }
        }

        #[allow(non_upper_case_globals)]
        const #fhe_program_name: #fhe_program_struct_name = #fhe_program_struct_name { };
    });

    fhe_program
}

/**
 * Lifts each return type T into FheProgramNode<T>.
 */
fn lift_return_type(ret: &ReturnType) -> TokenStream {
    match ret {
        ReturnType::Type(_, t) => {
            let tuple_inners = match &**t {
                Type::Tuple(t) => t
                    .elems
                    .iter()
                    .map(|x| {
                        let inner_type = &*x;

                        quote! {
                            sunscreen::types::intern::FheProgramNode<#inner_type>
                        }
                    })
                    .collect::<Vec<TokenStream>>(),
                Type::Paren(t) => {
                    let inner_type = &*t.elem;
                    let inner_type = quote! {
                        sunscreen::types::intern::FheProgramNode<#inner_type>
                    };

                    vec![inner_type]
                }
                Type::Path(_) => {
                    let r = &**t;
                    let r = quote! {
                        sunscreen::types::intern::FheProgramNode<#r>
                    };

                    vec![r]
                }
                _ => {
                    return TokenStream::from(quote! {
                        compile_error!("FhePrograms must return a single Cipthertext or a tuple of Ciphertexts");
                    });
                }
            };

            if tuple_inners.len() == 1 {
                let t = &tuple_inners[0];

                quote_spanned! {tuple_inners[0].span() =>
                    #t
                }
            } else {
                let t: Vec<TokenStream> = tuple_inners
                    .iter()
                    .map(|t| {
                        quote_spanned! {t.span() =>
                            #t,
                        }
                    })
                    .collect();

                quote_spanned! {ret.span() =>
                    (#(#t)*)
                }
            }
        }
        ReturnType::Default => {
            quote! { () }
        }
    }
}

fn capture_outputs(ret: &ReturnType) -> TokenStream {
    match ret {
        ReturnType::Type(_, t) => {
            let tuple_inners = match &**t {
                Type::Tuple(t) => t.elems.iter().map(|x| &*x).collect::<Vec<&Type>>(),
                Type::Paren(t) => {
                    vec![&*t.elem]
                }
                Type::Path(_) => {
                    vec![&**t]
                }
                _ => {
                    return TokenStream::from(quote! {
                        compile_error!("FhePrograms must return a single Cipthertext or a tuple of Ciphertexts");
                    });
                }
            };

            if tuple_inners.len() == 1 {
                quote_spanned! {tuple_inners[0].span() =>
                    v.output();
                }
            } else {
                tuple_inners
                    .iter()
                    .enumerate()
                    .map(|(i, t)| {
                        let index = Index::from(i);

                        quote_spanned! {t.span() =>
                            v.#index.output();
                        }
                    })
                    .collect()
            }
        }
        ReturnType::Default => {
            quote! {}
        }
    }
}

fn create_signature(args: &[&Type], ret: &ReturnType) -> TokenStream {
    // We have to type alias arguments and returns because they might
    // be generic and cause an error during invocation.
    // E.g. Foo<Bar> causes an error when doing Foo<Bar>::func()
    // because you need :: after Foo.
    // So we make type aliases and invoke the function on the alias.
    let arg_type_names = args
        .iter()
        .enumerate()
        .map(|(i, t)| {
            let alias = ident("T", i);

            quote! {
                type #alias = #t;
            }
        })
        .collect::<Vec<TokenStream>>();

    let arg_get_types = arg_type_names.iter().enumerate().map(|(i, _)| {
        let alias = ident("T", i);

        quote! {
            #alias::type_name(),
        }
    });

    let (return_type_aliases, return_type_names, return_type_sizes) = match ret {
        ReturnType::Type(_, t) => {
            let tuple_inners = match &**t {
                Type::Tuple(t) => t.elems.iter().map(|x| &*x).collect::<Vec<&Type>>(),
                Type::Paren(t) => {
                    vec![&*t.elem]
                }
                Type::Path(_) => {
                    vec![&**t]
                }
                _ => {
                    return TokenStream::from(quote! {
                        compile_error!("FhePrograms must return a single Cipthertext or a tuple of Ciphertexts");
                    });
                }
            };

            let return_type_aliases = tuple_inners.iter().enumerate().map(|(i, t)| {
                let alias = ident("R", i);

                quote! {
                    type #alias = #t;
                }
            });

            let return_type_sizes = tuple_inners.iter().enumerate().map(|(i, _)| {
                let alias = ident("R", i);

                quote! {
                    #alias ::NUM_CIPHERTEXTS,
                }
            });

            let type_names = tuple_inners.iter().enumerate().map(|(i, _)| {
                let alias = ident("R", i);

                quote! {
                    #alias ::type_name(),
                }
            });

            (
                quote! {
                    #(#return_type_aliases)*
                },
                quote! {
                    vec![
                        #(#type_names)*
                    ]
                },
                quote! {
                    vec![
                        #(#return_type_sizes)*
                    ]
                },
            )
        }
        ReturnType::Default => (quote! {}, quote! { vec![] }, quote! { vec![] }),
    };

    quote! {
        use sunscreen::types::TypeName;

        #(#arg_type_names)*
        #return_type_aliases

        sunscreen::CallSignature {
            arguments: vec![#(#arg_get_types)*],
            returns: #return_type_names,
            num_ciphertexts: #return_type_sizes,
        }
    }
}

fn ident(prefix: &str, i: usize) -> Ident {
    Ident::new(&format!("{}{}", prefix, i), Span::call_site())
}
