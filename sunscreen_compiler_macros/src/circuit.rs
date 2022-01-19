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
    let inputs = &input_fn.sig.inputs;
    let ret = &input_fn.sig.output;

    let mut unwrapped_inputs = vec![];

    let attr_params = parse_macro_input!(metadata as Attrs);

    let scheme_type = match attr_params.scheme {
        Scheme::Bfv => {
            quote! {
                sunscreen_compiler::SchemeType::Bfv
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

    let catpured_outputs = capture_outputs(ret);
    let circuit_returns = lift_return_type(ret);

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

    let circuit_struct_name = Ident::new(&format!("{}_struct", circuit_name), Span::call_site());

    let circuit = proc_macro::TokenStream::from(quote! {
        #[allow(non_camel_case_types)]
        #vis struct #circuit_struct_name {
        }

        impl sunscreen_compiler::CircuitFn for #circuit_struct_name {
            fn build(&self, params: &Params) -> sunscreen_compiler::Result<sunscreen_compiler::FrontendCompilation> {  
                use std::cell::RefCell;
                use std::mem::transmute;
                use sunscreen_compiler::{CURRENT_CTX, Context, Error, INDEX_ARENA, Result, Params, SchemeType, Value, types::{CircuitNode, NumCiphertexts, Type, TypeName, TypeNameInstance}};  

                if SchemeType::Bfv != params.scheme_type {
                    return Err(Error::IncorrectScheme)
                }

                // TODO: Other schemes.
                let mut context = Context::new(params);

                CURRENT_CTX.with(|ctx| {
                    let internal = | #(#circuit_args)* | -> #circuit_returns
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

            fn signature(&self) -> sunscreen_compiler::CallSignature {
                use sunscreen_compiler::types::NumCiphertexts;

                #signature
            }

            fn scheme_type(&self) -> sunscreen_compiler::SchemeType {
                #scheme_type
            }
        }

        #[allow(non_upper_case_globals)]
        const #circuit_name: #circuit_struct_name = #circuit_struct_name { };
    });

    //panic!("{}", circuit);
    circuit
}

/**
 * Lifts each return type T into CircuitNode<T>.
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
                            sunscreen_compiler::types::CircuitNode<#inner_type>
                        }
                    })
                    .collect::<Vec<TokenStream>>(),
                Type::Paren(t) => {
                    let inner_type = &*t.elem;
                    let inner_type = quote! {
                        sunscreen_compiler::types::CircuitNode<#inner_type>
                    };

                    vec![inner_type]
                }
                Type::Path(_) => {
                    let r = &**t;
                    let r = quote! {
                        sunscreen_compiler::types::CircuitNode<#r>
                    };

                    vec![r]
                }
                _ => {
                    return TokenStream::from(quote! {
                        compile_error!("Circuits must return a single Cipthertext or a tuple of Ciphertexts");
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
    // We have to type alias arguments and returns because they might
    // be generic and cause an error during invocation.
    // E.g. Foo<Bar> causes an error when doing Foo<Bar>::func()
    // because you need :: after Foo.
    // So we make type aliases and invoke the function on the alias.
    let arg_type_names = args.iter().enumerate().map(|(i, t)| {
        let alias = ident("T", i);

        quote! {
            type #alias = #t;
        }
    }).collect::<Vec<TokenStream>>();

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
                        compile_error!("Circuits must return a single Cipthertext or a tuple of Ciphertexts");
                    });
                }
            };

            let return_type_aliases = tuple_inners
                .iter()
                .enumerate()
                .map(|(i, t)| {
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
        ReturnType::Default => (quote! { }, quote! { vec![] }, quote! { vec![] }),
    };

    quote! {
        use sunscreen_compiler::types::TypeName;

        #(#arg_type_names)*
        #return_type_aliases

        sunscreen_compiler::CallSignature {
            arguments: vec![#(#arg_get_types)*],
            returns: #return_type_names,
            num_ciphertexts: #return_type_sizes,
        }
    }
}

fn ident(prefix: &str, i: usize) -> Ident {
    Ident::new(&format!("{}{}", prefix, i), Span::call_site())
}