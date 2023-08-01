use crate::{
    internals::attr::{FheProgramAttrs},
};

use quote::{quote};

use syn::{parse_macro_input, ItemFn};

pub fn debug_program_impl(
    metadata: proc_macro::TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let name = &input_fn.sig.ident;
    let body = &input_fn.block;
    let inputs = &input_fn.sig.inputs;
    let ret = &input_fn.sig.output;

    // TODO: Currently hardcoded to 1
    let _group_name = &format!("{:?}_{:?}", name, 1);
    let _attr_params = parse_macro_input!(metadata as FheProgramAttrs);

    // # is a special thing in macros
    // takes the variable name and fills it in
    quote! {
        use std::cell::RefCell;
        use std::mem::transmute;
        use sunscreen::{fhe::{CURRENT_PROGRAM_CTX, FheContext}, Error, INDEX_ARENA, Result, Params, SchemeType, Value, types::{intern::{FheProgramNode, Input, Output}, NumCiphertexts, Type, TypeName, SwapRows, LaneCount, TypeNameInstance}};
        use sunscreen::{ZkpContext, ZkpData, Error, INDEX_ARENA, Result, types::{zkp::{ProgramNode, CreateZkpProgramInput, ConstrainEq, IntoProgramNode}, TypeName}};

        fn #name(#inputs) -> #ret {
            // compilation_context is a refcell of option of something
            // so need to handle the case where they don't call the function even though it's annotated
            // so don't push a context
            // given refcell we can get a mutable reference to the context
            COMPILATION_CONTEXT.push_group(group_name)
            // push group
            #body
            // pop group

            // in add_node, update the group lookup structure
        }
    }.into()
}
