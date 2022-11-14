use proc_macro2::{Ident, Span, TokenStream};
use quote::{quote, quote_spanned};
use sunscreen_compiler_common::macros::{
    create_program_node, emit_signature, extract_fn_arguments, lift_type,
    ExtractFnArgumentsError,
};
use syn::{parse_macro_input, spanned::Spanned, ItemFn, ReturnType, Type};

use crate::internals::attr::{ZkpProgramAttrs};

pub fn zkp_program_impl(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let _attr_params = parse_macro_input!(metadata as ZkpProgramAttrs);
    let input_fn = parse_macro_input!(input as ItemFn);

    let zkp_program_name = &input_fn.sig.ident;
    let vis = &input_fn.vis;
    let body = &input_fn.block;
    let inputs = &input_fn.sig.inputs;
    let ret = &input_fn.sig.output;

    match ret {
        ReturnType::Default => {}
        _ => {
            return proc_macro::TokenStream::from(quote_spanned! {
                ret.span() => compile_error!("ZKP programs may not return values.")
            });
        }
    };

    let unwrapped_inputs = match extract_fn_arguments(inputs) {
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
                    s => compile_error! { "FHE program arguments must be an array or named struct type" }
                },
            });
        }
    };

    let argument_types = unwrapped_inputs
        .iter()
        .map(|(t, _)| (**t).clone())
        .collect::<Vec<Type>>();

    let zkp_program_args = unwrapped_inputs
        .iter()
        .map(|i| {
            let (ty, name) = i;
            let ty = lift_type(ty).unwrap();

            quote! {
                #name: #ty,
            }
        })
        .collect::<Vec<TokenStream>>();

    let signature = emit_signature(&argument_types, &[]);

    let var_decl = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let var_name = format!("c_{}", i);

        create_program_node(&var_name, t.0)
    });

    let args = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());

        quote_spanned! {t.0.span() =>
            #id
        }
    });

    let zkp_program_struct_name =
        Ident::new(&format!("{}_struct", zkp_program_name), Span::call_site());

    let zkp_program_name_literal = format!("{}", zkp_program_name);

    proc_macro::TokenStream::from(quote! {
        #[allow(non_camel_case_types)]
        #[derive(Clone)]
        #vis struct #zkp_program_struct_name {
        }

        impl sunscreen::ZkpProgramFn for #zkp_program_struct_name {
            fn build(&self) -> sunscreen::Result<sunscreen::ZkpFrontendCompilation> {
                use std::cell::RefCell;
                use std::mem::transmute;
                use sunscreen::{CURRENT_ZKP_CTX, ZkpContext, Error, INDEX_ARENA, Result, types::{zkp::ProgramNode, TypeName}};

                let mut context = ZkpContext::new();

                CURRENT_ZKP_CTX.with(|ctx| {
                    #[allow(clippy::type_complexity)]
                    #[forbid(unused_variables)]
                    let internal = | #(#zkp_program_args)* |
                        #body
                    ;

                    // Transmute away the lifetime to 'static. So long as we are careful with internal()
                    // panicing, this is safe because we set the context back to none before the function
                    // returns.
                    ctx.swap(&RefCell::new(Some(unsafe { transmute(&mut context) })));

                    #(#var_decl)*

                    let panic_res = std::panic::catch_unwind(|| {
                        internal(#(#args),*)
                    });

                    // when panicing or not, we need to clear our indicies arena and
                    // unset the context reference.
                    match panic_res {
                        Ok(v) => { },
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

                Ok(context.graph)
            }

            fn signature(&self) -> sunscreen::CallSignature {
                #signature
            }

            fn name(&self) -> &str {
                #zkp_program_name_literal
            }
        }

        impl AsRef<str> for #zkp_program_struct_name {
            fn as_ref(&self) -> &str {
                use sunscreen::FheProgramFn;

                self.name()
            }
        }

        #[allow(non_upper_case_globals)]
        #vis const #zkp_program_name: #zkp_program_struct_name = #zkp_program_struct_name {
        };
    })
}
