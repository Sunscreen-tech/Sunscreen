use crate::{
    fhe_program_transforms::*,
    internals::attr::{FheProgramAttrs, Scheme},
};
use proc_macro2::{Span, TokenStream};
use quote::{quote, quote_spanned};
use sunscreen_compiler_common::macros::{extract_fn_arguments, ExtractFnArgumentsError, FnArgInfo};
use syn::{parse_macro_input, spanned::Spanned, Error, Ident, ItemFn, Result, Type};

pub fn fhe_program_impl(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let item_fn = parse_macro_input!(input as ItemFn);
    let attr_params = parse_macro_input!(metadata as FheProgramAttrs);
    match FheProgram::new(&item_fn, attr_params).map(|f| f.output()) {
        Ok(t) => proc_macro::TokenStream::from(t),
        Err(e) => proc_macro::TokenStream::from(Error::into_compile_error(e)),
    }
}

// TODO move validation errors into a `FheProgram::new() -> Result<Self>` function,
// gather the useful fields onto the struct,
// then call `FheProgram::new().and_then(|f|f.output())`.
struct FheProgram<'a> {
    // The function passed to the proc macro
    item_fn: &'a ItemFn,
    // The attributes on the proc macro
    attr_params: FheProgramAttrs,
    // Each argument's attributes, type, and identifier
    unwrapped_inputs: Vec<FnArgInfo<'a>>,
    // Return types of the input program (tuple turns into vector)
    return_types: Vec<Type>,
    // Return types of the fhe program (i.e. wrapped in FheProgramNode)
    fhe_program_return_types: Vec<Type>,
}

impl<'a> FheProgram<'a> {
    // Handles validation
    fn new(item_fn: &'a ItemFn, attr_params: FheProgramAttrs) -> Result<Self> {
        let generics = &item_fn.sig.generics;
        let inputs = &item_fn.sig.inputs;
        let ret = &item_fn.sig.output;

        if !generics.params.is_empty() {
            return Err(Error::new(
                generics.params.span(),
                "FHE programs do not support generics.",
            ));
        }

        let unwrapped_inputs: Vec<(Vec<syn::Attribute>, &Type, &Ident)> =
            extract_fn_arguments(inputs)
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

        let return_types = extract_return_types(ret)
            .map_err(|ExtractReturnTypesError::IllegalType(s)|
                Error::new(s, "FHE programs may return a single value or a tuple of values. Each type must be an FHE type or array of such.")
            )?;

        let fhe_program_return_types = return_types
            .iter()
            .map(map_fhe_type)
            .collect::<std::result::Result<Vec<Type>, MapFheTypeError>>()
            .map_err(|MapFheTypeError::IllegalType(s)|
                Error::new(s, "Each return type for an FHE program must be either an array or named struct type.")
            )?;

        Ok(Self {
            item_fn,
            attr_params,
            unwrapped_inputs,
            return_types,
            fhe_program_return_types,
        })
    }

    // The sunscreen::CallSignature value
    fn signature(&self) -> TokenStream {
        let argument_types = self
            .unwrapped_inputs
            .iter()
            .map(|(_, t, _)| (**t).clone())
            .collect::<Vec<Type>>();
        emit_signature(&argument_types, &self.return_types)
    }

    // The arguments to the internal closure (input args wrapped in FheProgramNode)
    fn fhe_program_args(&self) -> Vec<TokenStream> {
        self.unwrapped_inputs
            .iter()
            .map(|(_, ty, name)| {
                let ty = map_fhe_type(ty).unwrap();
                quote! {
                    #name: #ty,
                }
            })
            .collect()
    }

    // Variable declarations like (but not exactly):
    // `__c_0: FheProgramNode<Cipher<Signed>> = FheProgramNode::input()`
    fn fhe_arg_var_decl(&self) -> Vec<TokenStream> {
        self.unwrapped_inputs
            .iter()
            .enumerate()
            .map(|(i, t)| {
                let var_name = format!("__c_{}", i);
                create_fhe_program_node(&var_name, t.1)
            })
            .collect()
    }

    // The variables themselves (used after declaration): e.g. `__c_0`
    // Note: must match naming format from `fhe_arg_var_decl`.
    fn fhe_arg_vars(&self) -> Vec<TokenStream> {
        self.unwrapped_inputs
            .iter()
            .enumerate()
            .map(|(i, t)| {
                let id = Ident::new(&format!("__c_{}", i), Span::call_site());
                quote_spanned!(t.1.span()=> #id)
            })
            .collect()
    }

    // Identifiers of the internal_inner return values, e.g. `__r_0`
    // These are spanned on their respective return types.
    fn inner_return_idents(&self) -> Vec<Ident> {
        self.fhe_program_return_types
            .iter()
            .enumerate()
            .map(|(i, t)| Ident::new(&format!("__r_{}", i), t.span()))
            .collect()
    }

    fn output(self) -> TokenStream {
        let input_fn = self.item_fn;
        let attr_params = &self.attr_params;
        let unwrapped_inputs = &self.unwrapped_inputs;
        let return_types = &self.return_types;
        let fhe_program_return_types = &self.fhe_program_return_types;

        let fhe_program_name = &input_fn.sig.ident;
        let vis = &input_fn.vis;
        let body = &input_fn.block;

        let chain_count = attr_params.chain_count;
        let scheme_type = match attr_params.scheme {
            Scheme::Bfv => {
                quote! {
                    sunscreen::SchemeType::Bfv
                }
            }
        };

        let fhe_program_args = self.fhe_program_args();
        let fhe_program_return = pack_into_tuple(fhe_program_return_types);

        let inner_return = pack_into_tuple(&wrap_impl_into(fhe_program_return_types));
        let inner_arg_values = unwrapped_inputs.iter().map(|(_, _, name)| *name);
        let inner_return_idents = self.inner_return_idents();
        let inner_return_values = pack_into_tuple(&inner_return_idents);
        // E.g. (_r1.into(), _r2.into())
        let inner_return_into_values = pack_into_tuple(&suffix_into(&inner_return_idents));

        let signature = self.signature();

        let fhe_arg_var_decl = self.fhe_arg_var_decl();
        let fhe_arg_vars = self.fhe_arg_vars();
        let output_var = Ident::new("__v", Span::call_site());
        let output_capture = emit_output_capture(&output_var, return_types);

        let fhe_program_struct_name =
            Ident::new(&format!("{}_struct", fhe_program_name), Span::call_site());

        let fhe_program_name_literal = format!("{}", fhe_program_name);

        quote! {
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
                        #[allow(clippy::let_unit_value)]
                        #[allow(clippy::unused_unit)]
                        #[allow(clippy::type_complexity)]
                        #[forbid(unused_variables)]
                        let internal = | #(#fhe_program_args)* | -> #fhe_program_return {
                            fn internal_inner(#(#fhe_program_args)*) -> #inner_return #body

                            let #inner_return_values = internal_inner( #(#inner_arg_values),* );
                            #inner_return_into_values
                        };

                        // Transmute away the lifetime to 'static. So long as we are careful with internal()
                        // panicing, this is safe because we set the context back to none before the funtion
                        // returns.
                        ctx.swap(&RefCell::new(Some(unsafe { transmute(&mut context) })));

                        #(#fhe_arg_var_decl)*

                        let panic_res = std::panic::catch_unwind(|| {
                            internal(#(#fhe_arg_vars),*)
                        });

                        // when panicing or not, we need to collect our indicies arena and
                        // unset the context reference.
                        match panic_res {
                            Ok(#output_var) => { #output_capture },
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
                    #[allow(unused_imports)]
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
        }
    }
}

#[cfg(test)]
mod test {
    use syn::parse_quote;

    use super::*;

    #[test]
    fn basic_multiply_works() {
        let attrs = FheProgramAttrs {
            scheme: Scheme::Bfv,
            chain_count: 1,
        };
        let attempt_fn = parse_quote! {
            fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
                a * b
            }
        };

        assert!(FheProgram::new(&attempt_fn, attrs).is_ok())
    }

    #[test]
    fn disallows_mut() {
        let attrs = FheProgramAttrs {
            scheme: Scheme::Bfv,
            chain_count: 1,
        };
        let attempt_fn = parse_quote! {
            fn simple_multiply(mut a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
                a * b
            }
        };

        assert!(FheProgram::new(&attempt_fn, attrs).is_err())
    }

    #[test]
    fn disallows_generics() {
        let attrs = FheProgramAttrs {
            scheme: Scheme::Bfv,
            chain_count: 1,
        };
        let attempt_fn = parse_quote! {
            fn simple_multiply<T>(a: Cipher<T>, b: Cipher<Signed>) -> Cipher<Signed> {
                b
            }
        };

        assert!(FheProgram::new(&attempt_fn, attrs).is_err())
    }
}
