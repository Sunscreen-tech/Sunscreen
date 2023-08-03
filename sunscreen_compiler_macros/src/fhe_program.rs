use crate::{
    fhe_program_transforms::*,
    internals::attr::{FheProgramAttrs, Scheme},
};
use proc_macro2::{Span, TokenStream};
use quote::{quote, quote_spanned};
use sunscreen_compiler_common::macros::{extract_fn_arguments, ExtractFnArgumentsError};
use syn::{parse_macro_input, spanned::Spanned, Ident, ItemFn, Type};

pub fn fhe_program_impl(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let raw_fn = input_fn.span().source_text().unwrap_or_default();

    let fhe_program_name = &input_fn.sig.ident;
    let vis = &input_fn.vis;
    let body = &input_fn.block;
    let inputs = &input_fn.sig.inputs;
    let ret = &input_fn.sig.output;

    let attr_params = parse_macro_input!(metadata as FheProgramAttrs);

    let scheme_type = match attr_params.scheme {
        Scheme::Bfv => {
            quote! {
                sunscreen::SchemeType::Bfv
            }
        }
    };

    let chain_count = attr_params.chain_count;

    let unwrapped_inputs = match extract_fn_arguments(inputs) {
        Ok(v) => {
            for arg in &v {
                if !arg.0.is_empty() {
                    return proc_macro::TokenStream::from(
                        quote_spanned! { arg.1.span() => compile_error!("FHE program arguments do not support attributes.")},
                    );
                }
            }

            v
        }
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
        .map(|(_, t, _)| (**t).clone())
        .collect::<Vec<Type>>();

    let fhe_program_args = unwrapped_inputs
        .iter()
        .map(|i| {
            let (_, ty, name) = i;
            let ty = map_fhe_type(ty).unwrap();

            quote! {
                #name: #ty,
            }
        })
        .collect::<Vec<TokenStream>>();

    let return_types = match extract_return_types(ret) {
        Ok(v) => v,
        Err(ExtractReturnTypesError::IllegalType(s)) => {
            return proc_macro::TokenStream::from(
                quote_spanned! {s => compile_error! {"FHE programs may return a single value or a tuple of values. Each type must be an FHE type or array of such."}},
            );
        }
    };

    let output_capture = emit_output_capture(&return_types);

    let fhe_program_returns = match return_types
        .iter()
        .map(map_fhe_type)
        .collect::<Result<Vec<Type>, MapFheTypeError>>()
    {
        Ok(v) => v,
        Err(MapFheTypeError::IllegalType(s)) => {
            return proc_macro::TokenStream::from(
                quote_spanned! {s => compile_error! {"Each return type for an FHE program must be either an array or named struct type."}},
            );
        }
    };

    let fhe_program_return = pack_return_type(&fhe_program_returns);

    let signature = emit_signature(&argument_types, &return_types);

    let var_decl = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let var_name = format!("c_{}", i);

        create_fhe_program_node(&var_name, t.1)
    });

    let args = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());

        quote_spanned! {t.1.span() =>
            #id
        }
    });

    let fhe_program_struct_name =
        Ident::new(&format!("{}_struct", fhe_program_name), Span::call_site());

    let fhe_program_name_literal = format!("{}", fhe_program_name);

    proc_macro::TokenStream::from(quote! {
        #[allow(non_camel_case_types)]
        #[derive(Clone)]
        #vis struct #fhe_program_struct_name {
            chain_count: usize
        }

        impl sunscreen::FheProgramFn for #fhe_program_struct_name {
            fn build(&self, params: &sunscreen::Params) -> sunscreen::Result<sunscreen::fhe::FheFrontendCompilation> {
                use std::cell::RefCell;
                use std::mem::transmute;
                use sunscreen::{fhe::{CURRENT_PROGRAM_CTX, FheContext}, ContextEnum, Error, INDEX_ARENA, Result, Params, SchemeType, Value, types::{intern::{FheProgramNode, Input, Output}, NumCiphertexts, Type, TypeName, SwapRows, LaneCount, TypeNameInstance}};

                if SchemeType::Bfv != params.scheme_type {
                    return Err(Error::IncorrectScheme)
                }

                // TODO: Other schemes.
                let mut context = ContextEnum::Fhe(FheContext::new(params.clone()));
                context.push_group(#fhe_program_name_literal, #raw_fn);

                CURRENT_PROGRAM_CTX.with(|ctx| {
                    #[allow(clippy::type_complexity)]
                    #[forbid(unused_variables)]
                    let internal = | #(#fhe_program_args)* | -> #fhe_program_return
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
                        Ok(v) => { #output_capture },
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

                Ok(context.unwrap_fhe().graph.clone())
            }

            fn signature(&self) -> sunscreen::CallSignature {
                use sunscreen::types::NumCiphertexts;

                #signature
            }

            fn scheme_type(&self) -> sunscreen::SchemeType {
                #scheme_type
            }

            fn name(&self) -> &str {
                #fhe_program_name_literal
            }

            fn chain_count(&self) -> usize {
                self.chain_count
            }

            fn source(&self) -> &'static str {
                #raw_fn
            }
        }

        impl AsRef<str> for #fhe_program_struct_name {
            fn as_ref(&self) -> &str {
                use sunscreen::FheProgramFn;

                self.name()
            }
        }

        #[allow(non_upper_case_globals)]
        #vis const #fhe_program_name: #fhe_program_struct_name = #fhe_program_struct_name {
            chain_count: #chain_count
        };
    })
}
