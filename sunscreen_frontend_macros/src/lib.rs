#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]
#![recursion_limit = "128"]

//! This crate contains macros to support the sunscreen compiler.

extern crate proc_macro;

use proc_macro2::{Span, TokenStream};
use quote::{quote, quote_spanned};
use syn::{
    parse_macro_input, parse_quote, spanned::Spanned, Data, DeriveInput, Fields, FnArg,
    GenericParam, Generics, Ident, Index, ItemFn, ReturnType, Type,
};

#[proc_macro_derive(Value)]
/**
 * Allows you to #[derive(Value)]. All members must impl value for this to work.
 */
pub fn derive_value(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    let name = input.ident;

    let generics = add_trait_bounds(input.generics);
    let (impl_generics, ty_generics, where_clause) = generics.split_for_impl();

    let new = new_body(&input.data);

    let expanded = quote! {
        // The generated impl.
        impl #impl_generics sunscreen_frontend::Value for #name #ty_generics #where_clause {
            fn new(id: usize) {
                #new
            }
        }
    };

    proc_macro::TokenStream::from(expanded)
}

// Add a bound `T: Ciphertext` to every type parameter T.
fn add_trait_bounds(mut generics: Generics) -> Generics {
    for param in &mut generics.params {
        if let GenericParam::Type(ref mut type_param) = *param {
            type_param
                .bounds
                .push(parse_quote!(sunscreen_frontend::Value));
        }
    }
    generics
}

fn new_body(data: &Data) -> TokenStream {
    match *data {
        Data::Struct(ref data) => match data.fields {
            Fields::Named(ref fields) => {
                let mut field_num = 0usize;

                let recurse = fields.named.iter().map(|f| {
                    let name = &f.ident;
                    let index = Index::from(field_num);
                    let res = quote_spanned! {f.span()=>
                        #name: Value::new(self.id + #index)
                    };

                    field_num += 1;
                    res
                });
                quote! {
                    Self {
                        #(#recurse),*
                    }
                }
            }
            Fields::Unnamed(ref fields) => {
                let recurse = fields.unnamed.iter().enumerate().map(|(i, f)| {
                    let index = Index::from(i);
                    quote_spanned! {f.span()=>
                        Value::new(self.id + #index)
                    }
                });
                quote! {
                    Self(#(#recurse),*)
                }
            }
            Fields::Unit => {
                quote!(0)
            }
        },
        Data::Enum(_) | Data::Union(_) => unimplemented!(),
    }
}

#[proc_macro_attribute]
/**
 * Specifies a function to be a circuit. A circuit has any number of inputs that impl the
 * [`Value`](sunscreen_frontend_types::Value) trait and returns either a single type implementing `Value` or a tuple of
 * types implementing `Value`.
 *
 * This function gets run by the compiler to build up the circuit you specify and does not
 * directly or eagerly perform homomorphic operations.
 *
 * # Examples
 * ```rust
 * # use sunscreen_frontend_types::{types::Signed, Params, Context};
 * # use sunscreen_frontend_macros::{circuit};
 * 
 * #[circuit]
 * fn multiply_add(a: Signed, b: Signed, c: Signed) -> Signed {
 *   a * b + c
 * }
 * ```
 *
 * ```rust
 * #[circuit]
 * fn multi_out(a: Signed, b: Signed, c: Signed) -> (Signed, Signed) {
 *   (a + b, b + c)
 * }
 * ```
 */
pub fn circuit(
    _metadata: proc_macro::TokenStream,
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

    for i in inputs {
        let input_type = match i {
            FnArg::Receiver(_) => {
                return proc_macro::TokenStream::from(quote! {
                    compile_error!("circuits must not take a reference to self");
                });
            }
            FnArg::Typed(t) => match &*t.ty {
                Type::Path(_) => t,
                _ => {
                    return proc_macro::TokenStream::from(quote! {
                        compile_error!("not path");
                    });
                }
            },
        };

        unwrapped_inputs.push(input_type);
    }

    let var_decl = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());
        let ty = &t.ty;

        quote_spanned! {t.span() =>
            let #id = #ty ::new();
        }
    });

    let args = unwrapped_inputs.iter().enumerate().map(|(i, _)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());

        quote! {
            #id
        }
    });

    let capture_outputs = match ret {
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
                    return proc_macro::TokenStream::from(quote! {
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
    };

    proc_macro::TokenStream::from(quote! {
        #(#attrs)*
        #vis fn #circuit_name(params: &Params) -> sunscreen_frontend::Context {
            use std::cell::RefCell;
            use std::mem::transmute;
            use sunscreen_frontend::{CURRENT_CTX, Context, Params, SchemeType, Value};

            // TODO: Other schemes.
            let mut context = Context::new(SchemeType::Bfv);
            let mut cur_id = 0usize;

            CURRENT_CTX.with(|ctx| {
                fn internal(#inputs) #ret {
                    #body
                }

                // Transmute away the lifetime to 'static. So long as we are careful with internal()
                // panicing, this is safe because we set the context back to none before the funtion
                // returns.
                ctx.swap(&RefCell::new(Some(unsafe { transmute(&context) })));

                #(#var_decl)*

                let panic_res = std::panic::catch_unwind(|| {
                    internal(#(#args),*)
                });

                match panic_res {
                    Ok(v) => { #capture_outputs },
                    Err(err) => {
                        ctx.swap(&RefCell::new(None));
                        std::panic::resume_unwind(err)
                    }
                };

                ctx.swap(&RefCell::new(None));
            });

            context
        }
    })
}
