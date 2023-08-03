use quote::quote;
use syn::{parse_macro_input, spanned::Spanned, ItemFn};

pub fn debug_program_impl(
    _metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let raw_fn = input_fn.block.span().source_text().unwrap();

    let name = &input_fn.sig.ident;
    let body = &input_fn.block;
    let inputs = &input_fn.sig.inputs;
    let generics = &input_fn.sig.generics;
    let ret = &input_fn.sig.output;
    let where_clause = &generics.where_clause;

    let fn_name = name.to_string();

    quote! {


        fn #name #generics(#inputs) #ret #where_clause {
            use std::cell::RefCell;
            use std::mem::transmute;
            use sunscreen::{CURRENT_PROGRAM_CTX};
            CURRENT_PROGRAM_CTX.with(|ctx| {
                let option = &mut *ctx.borrow_mut();
                option.as_mut().unwrap().push_group(&#fn_name, &#raw_fn);
            });

            let result = {
                #body
            };

            CURRENT_PROGRAM_CTX.with(|ctx| {
                let option = &mut *ctx.borrow_mut();
                option.as_mut().unwrap().pop_group();
            });

            result
        }
    }
    .into()
}
