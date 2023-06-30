use crate::{
    fhe_program_transforms::*,
    internals::attr::{FheProgramAttrs, Scheme},
};
use proc_macro2::{Span, TokenStream};
use quote::{quote, quote_spanned};
use sunscreen_compiler_common::macros::{extract_fn_arguments, ExtractFnArgumentsError};
use syn::{parse_macro_input, spanned::Spanned, Error, Ident, ItemFn, Result, Type};

pub fn fhe_program_impl(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let item_fn = parse_macro_input!(input as ItemFn);
    let attr_params = parse_macro_input!(metadata as FheProgramAttrs);
    let fhe_program = FheProgram {
        item_fn,
        attr_params,
    };
    match fhe_program.output() {
        Ok(t) => proc_macro::TokenStream::from(t),
        Err(e) => proc_macro::TokenStream::from(Error::into_compile_error(e)),
    }
}

// TODO move validation errors into a `FheProgram::new() -> Result<Self>` function,
// gather the useful fields onto the struct,
// then call `FheProgram::new().and_then(|f|f.output())`.
struct FheProgram {
    item_fn: ItemFn,
    attr_params: FheProgramAttrs,
}

impl FheProgram {
    fn output(self) -> Result<TokenStream> {
        let input_fn = self.item_fn;
        let attr_params = self.attr_params;

        let fhe_program_name = &input_fn.sig.ident;
        let vis = &input_fn.vis;
        let body = &input_fn.block;
        let generics = &input_fn.sig.generics;
        let inputs = &input_fn.sig.inputs;
        let ret = &input_fn.sig.output;

        let scheme_type = match attr_params.scheme {
            Scheme::Bfv => {
                quote! {
                    sunscreen::SchemeType::Bfv
                }
            }
        };

        let chain_count = attr_params.chain_count;

        if !generics.params.is_empty() {
            return Err(Error::new(
                generics.params.span(),
                "FHE programs do not support generics.",
            ));
        }

        let unwrapped_inputs = extract_fn_arguments(inputs)
            .map_err(|e| match e {
                ExtractFnArgumentsError::ContainsSelf(s) => {
                    Error::new(s, "FHE programs must not contain `self`")
                }
                ExtractFnArgumentsError::ContainsMut(s) => {
                    Error::new(s, "FHE program arguments cannot be `mut`")
                }
                ExtractFnArgumentsError::IllegalPat(s) => Error::new(s, "Expected Identifier"),
                ExtractFnArgumentsError::IllegalType(s) => Error::new(
                    s,
                    "FHE program arguments must be an array or named struct type",
                ),
            })
            .and_then(|v| {
                for arg in &v {
                    if !arg.0.is_empty() {
                        return Err(Error::new(
                            arg.0[0].span(),
                            "FHE program arguments do not support attributes.",
                        ));
                    }
                }
                Ok(v)
            })?;

        let argument_types = unwrapped_inputs
            .iter()
            .map(|(_, t, _)| (**t).clone())
            .collect::<Vec<Type>>();

        let fhe_program_args = unwrapped_inputs
            .iter()
            .map(|(_, ty, name)| {
                let ty = map_fhe_type(ty).unwrap();
                quote! {
                    #name: #ty,
                }
            })
            .collect::<Vec<TokenStream>>();

        let return_types = extract_return_types(ret).map_err(|ExtractReturnTypesError::IllegalType(s)|
            Error::new(s, "FHE programs may return a single value or a tuple of values. Each type must be an FHE type or array of such.")
        )?;

        let output_capture = emit_output_capture(&return_types);

        let fhe_program_returns = return_types
            .iter()
            .map(map_fhe_type)
            .collect::<std::result::Result<Vec<Type>, MapFheTypeError>>()
            .map_err(|MapFheTypeError::IllegalType(s)|
                Error::new(s, "Each return type for an FHE program must be either an array or named struct type.")
            )?;

        let fhe_program_return = pack_return_type(&fhe_program_returns);

        // Tokens necessary for the `internal_internal` function, which returns any types that can
        // `.into` the `fhe_program_return` types.
        // E.g. (impl Into<Cipher<Signed>>, impl Into<Cipher<Signed>>)
        let inner_return = pack_return_into_type(&fhe_program_returns);
        // E.g. a, b
        let inner_arg_values = unwrapped_inputs.iter().map(|(_, _, name)| *name);
        // E.g. (_r1, _r2)
        let inner_return_idents = fhe_program_returns
            .iter()
            .enumerate()
            .map(|(i, t)| {
                let id = Ident::new(&format!("__r_{}", i), Span::call_site());
                quote_spanned!(t.span()=> #id)
            })
            .collect::<Vec<_>>();
        // TODO generalize the pack function to do more than just types
        let inner_return_values = match &inner_return_idents[..] {
            [r1] => quote! { #r1 },
            _ => quote! { ( #(#inner_return_idents),* ) },
        };
        // E.g. (_r1.into(), _r2.into())
        let inner_return_into_values = match &inner_return_idents[..] {
            [r1] => quote! { #r1.into() },
            _ => quote! { ( #(#inner_return_idents.into()),* ) },
        };

        let signature = emit_signature(&argument_types, &return_types);

        let var_decl = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
            let var_name = format!("c_{}", i);
            create_fhe_program_node(&var_name, t.1)
        });

        let args = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
            let id = Ident::new(&format!("c_{}", i), Span::call_site());
            quote_spanned!(t.1.span()=> #id)
        });

        let fhe_program_struct_name =
            Ident::new(&format!("{}_struct", fhe_program_name), Span::call_site());

        let fhe_program_name_literal = format!("{}", fhe_program_name);

        Ok(quote! {
            #[allow(non_camel_case_types)]
            #[derive(Clone)]
            #vis struct #fhe_program_struct_name {
                chain_count: usize
            }

            impl sunscreen::FheProgramFn for #fhe_program_struct_name {
                #[allow(unused_imports)]
                fn build(&self, params: &sunscreen::Params) -> sunscreen::Result<sunscreen::fhe::FheFrontendCompilation> {
                    use std::cell::RefCell;
                    use std::mem::transmute;
                    use sunscreen::{fhe::{CURRENT_FHE_CTX, FheContext}, Error, INDEX_ARENA, Result, Params, SchemeType, Value, types::{intern::{FheProgramNode, Input, Output}, NumCiphertexts, Type, TypeName, SwapRows, LaneCount, TypeNameInstance}};

                    if SchemeType::Bfv != params.scheme_type {
                        return Err(Error::IncorrectScheme)
                    }

                    // TODO: Other schemes.
                    let mut context = FheContext::new(params.clone());

                    CURRENT_FHE_CTX.with(|ctx| {
                        #[allow(clippy::type_complexity)]
                        #[forbid(unused_variables)]
                        let internal = | #(#fhe_program_args)* | -> #fhe_program_return {
                            fn internal_internal(#(#fhe_program_args)*) -> #inner_return #body

                            let #inner_return_values = internal_internal( #(#inner_arg_values),* );
                            #inner_return_into_values
                        };

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

                    Ok(context.graph)
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
}
