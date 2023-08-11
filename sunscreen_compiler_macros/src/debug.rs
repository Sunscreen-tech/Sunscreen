use quote::{quote, ToTokens};
use syn::{parse_macro_input, spanned::Spanned, ItemFn, Signature};

fn reconstruct_signature(sig: &Signature) -> String {
    let inputs = sig.inputs.clone().into_token_stream().to_string();
    let generics = if sig.generics.params.is_empty() {
        String::new()
    } else {
        format!("<{}>", sig.generics.params.clone().into_token_stream())
    };
    let output = match &sig.output {
        syn::ReturnType::Default => String::new(),
        syn::ReturnType::Type(_, typ) => format!(" -> {}", typ.clone().into_token_stream()),
    };

    format!("fn {}{}({}){}", sig.ident, generics, inputs, output)
}

pub fn debug_impl(
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
    let fn_signature = reconstruct_signature(&input_fn.sig);
    let group_body = format!("{} {}", fn_signature, raw_fn);

    quote! {
        fn #name #generics(#inputs) #ret #where_clause {
            use std::cell::RefCell;
            use std::mem::transmute;
            sunscreen::CURRENT_PROGRAM_CTX.with(|ctx| {
                let option = &mut *ctx.borrow_mut();
                option.as_mut().unwrap().push_group(&#fn_name, &#group_body);
            });

            let result = {
                #body
            };

            sunscreen::CURRENT_PROGRAM_CTX.with(|ctx| {
                let option = &mut *ctx.borrow_mut();
                option.as_mut().unwrap().pop_group();
            });

            result
        }
    }
    .into()
}
