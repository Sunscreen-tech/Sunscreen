#![recursion_limit="128"]

extern crate proc_macro;

use proc_macro2::{TokenStream, Span};
use syn::{Data, DeriveInput, Fields, FnArg, Generics, GenericParam, Ident, Index, ItemFn, parse_macro_input, parse_quote, spanned::Spanned, Type};
use quote::{quote, quote_spanned};

#[proc_macro_derive(Ciphertext)]
pub fn derive_ciphertext(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    let name = input.ident;

    let generics = add_trait_bounds(input.generics);
    let (impl_generics, ty_generics, where_clause) = generics.split_for_impl();
    
    let new = new_body(&input.data);

    let expanded = quote! {
        // The generated impl.
        impl #impl_generics heapsize::HeapSize for #name #ty_generics #where_clause {
            /*fn num_ciphertexts() -> usize {
                #num
            }*/

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
            type_param.bounds.push(parse_quote!(sunscreen_frontend_types::Ciphertext));
        }
    }
    generics
}

fn new_body(data: &Data) -> TokenStream {
    match *data {
        Data::Struct(ref data) => {
            match data.fields {
                Fields::Named(ref fields) => {
                    let mut field_num = 0usize;

                    let recurse = fields.named.iter().map(|f| {
                        let name = &f.ident;
                        let index = Index::from(field_num);
                        let res = quote_spanned! {f.span()=>
                            #name: Ciphertext::new(self.id + #index)
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
                            Ciphertext::new(self.id + #index)
                        }
                    });
                    quote! {
                        Self(#(#recurse),*)
                    }
                }
                Fields::Unit => {
                    quote!(0)
                }
            }
        }
        Data::Enum(_) | Data::Union(_) => unimplemented!(),
    }
}

#[proc_macro_attribute]
pub fn circuit(_metadata: proc_macro::TokenStream, input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    
    let circuit_name = &input_fn.sig.ident;
    let vis = &input_fn.vis;
    let body = &input_fn.block;
    let attrs = &input_fn.attrs;
    let inputs = &input_fn.sig.inputs;

    let mut unwrapped_inputs = vec![];

    for i in inputs {
        let input_type = match i {
            FnArg::Receiver(_) => {
                return proc_macro::TokenStream::from(quote! {
                    compile_error!("circuits must not take a reference to self");
                });
            },
            FnArg::Typed(t) => {
                match &*t.ty {
                    Type::Path(_) => { 
                        t
                    },
                    _ => {
                        return proc_macro::TokenStream::from(quote! {
                            compile_error!("not path");
                        });
                    }
                }
            }
        };

        unwrapped_inputs.push(input_type);
    }

    let var_decl = unwrapped_inputs.iter().enumerate().map(|(i, t)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());
        let ty = &t.ty;

        quote_spanned!{t.span() =>
            let #id = #ty ::new();
        }
    });

    let args = unwrapped_inputs.iter().enumerate().map(|(i, _)| {
        let id = Ident::new(&format!("c_{}", i), Span::call_site());

        quote! {
            #id
        }
    });
    
    proc_macro::TokenStream::from(quote!{
        #(#attrs)*
        #vis fn #circuit_name() -> sunscreen_frontend_types::Context {
            use std::cell::RefCell;
            use std::mem::transmute;
            use sunscreen_frontend_types::{CURRENT_CTX, Ciphertext};

            let mut context = Context::new();
            let mut cur_id = 0usize;

            CURRENT_CTX.with(|ctx| {
                fn internal(#inputs) {
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
                
                ctx.swap(&RefCell::new(None));

                if let Err(err) = panic_res {
                    std::panic::resume_unwind(err);
                }
            });

            context
        } 
    })
}
