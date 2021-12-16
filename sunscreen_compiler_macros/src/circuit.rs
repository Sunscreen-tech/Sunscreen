use crate::internals::{attr::Attrs, case::Scheme};
use proc_macro2::{Span, TokenStream};
use quote::{quote, quote_spanned};
use syn::{
    parse_macro_input, spanned::Spanned, FnArg, Ident, Index, ItemFn, Pat, ReturnType, Type,
};

pub fn circuit_impl(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);

    let circuit_name = &input_fn.sig.ident;
    let vis = &input_fn.vis;
    let body = &input_fn.block;
    let attrs = &input_fn.attrs;
    let inputs = &input_fn.sig.inputs;
    let ret = &input_fn.sig.output;

    let mut unwrapped_inputs = vec![];

    let attr_params = parse_macro_input!(metadata as Attrs);

    let scheme_type = match attr_params.scheme {
        Scheme::Bfv => {
            quote! {
                SchemeType::Bfv
            }
        }
    };

    for i in inputs {
        let input_type = match i {
            FnArg::Receiver(_) => {
                return proc_macro::TokenStream::from(quote! {
                    compile_error!("circuits must not take a reference to self");
                });
            }
            FnArg::Typed(t) => match (&*t.ty, &*t.pat) {
                (Type::Path(_), Pat::Ident(i)) => (t, &i.ident),
                _ => {
                    return proc_macro::TokenStream::from(quote! {
                        compile_error!("circuit arguments' name must be a simple identifier and type must be a plain path.");
                    });
                }
            },
        };

        unwrapped_inputs.push(input_type);
    }

    let signature = create_signature(
        &unwrapped_inputs
            .iter()
            .map(|t| &*t.0.ty)
            .collect::<Vec<&Type>>(),
        ret,
    );

    let circuit_args = unwrapped_inputs
        .iter()
        .map(|i| {
            let (ty, name) = i;
            let ty = &ty.ty;

            quote! {
                #name: CircuitNode<#ty>,
            }
        })
        .collect::<Vec<TokenStream>>();

    let var_decl = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());
        let ty = &t.0.ty;

        quote_spanned! {t.0.span() =>
            let #id: CircuitNode<#ty> = CircuitNode::input();
        }
    });

    let args = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());

        quote_spanned! {t.0.span() =>
            #id
        }
    });

    let catpured_outputs = capture_outputs(ret);

    proc_macro::TokenStream::from(quote! {
        #(#attrs)*
        #vis fn #circuit_name() -> (
            sunscreen_compiler::SchemeType,
            impl Fn(&sunscreen_compiler::Params) -> sunscreen_compiler::Result<sunscreen_compiler::FrontendCompilation>,
            sunscreen_compiler::CallSignature
        ) {
            use std::cell::RefCell;
            use std::mem::transmute;
            use sunscreen_compiler::{CURRENT_CTX, Context, Error, Result, Params, SchemeType, Value, types::{CircuitNode, NumCiphertexts, Type, TypeName, TypeNameInstance}};

            let circuit_builder = |params: &Params| {
                if SchemeType::Bfv != params.scheme_type {
                    return Err(Error::IncorrectScheme)
                }

                // TODO: Other schemes.
                let mut context = Context::new(params);

                CURRENT_CTX.with(|ctx| {
                    let internal = | #(#circuit_args)* | {
                        #body
                    };

                    // Transmute away the lifetime to 'static. So long as we are careful with internal()
                    // panicing, this is safe because we set the context back to none before the funtion
                    // returns.
                    ctx.swap(&RefCell::new(Some(unsafe { transmute(&mut context) })));

                    #(#var_decl)*

                    let panic_res = std::panic::catch_unwind(|| {
                        internal(#(#args),*)
                    });

                    match panic_res {
                        Ok(v) => { #catpured_outputs },
                        Err(err) => {
                            ctx.swap(&RefCell::new(None));
                            std::panic::resume_unwind(err)
                        }
                    };

                    ctx.swap(&RefCell::new(None));
                });

                Ok(context.compilation)
            };

            #signature;

            (#scheme_type, circuit_builder, signature)
        }
    })
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
                        compile_error!("Circuits must return a single Cipthertext or a tuple of Ciphertexts");
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
    let arg_type_names = args.iter().map(|t| {
        quote! {
            #t ::type_name(),
        }
    });

    let (return_type_names, return_type_sizes) = match ret {
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
                        compile_error!("Circuits must return a single Cipthertext or a tuple of Ciphertexts");
                    });
                }
            };

            let return_type_sizes = tuple_inners.iter().map(|t| {
                quote! {
                    #t ::NUM_CIPHERTEXTS,
                }
            });

            let type_names = tuple_inners.iter().map(|t| {
                quote! {
                    #t ::type_name(),
                }
            });

            (
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
        ReturnType::Default => (quote! { vec![] }, quote! { vec![] }),
    };

    quote! {
        let signature = sunscreen_compiler::CallSignature {
            arguments: vec![#(#arg_type_names)*],
            returns: #return_type_names,
            num_ciphertexts: #return_type_sizes,
        };
    }
}
