use darling::FromDeriveInput;
use num::{BigInt, FromPrimitive, Num};
use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::{quote, quote_spanned};
use syn::{
    parse_macro_input, punctuated::Punctuated, spanned::Spanned, DeriveInput, GenericArgument,
    ImplItem, ItemImpl, Path, PathArguments, PathSegment, Type,
};

#[derive(FromDeriveInput, Debug)]
#[darling(attributes(barrett_config), forward_attrs(allow, doc, cfg))]
struct Opts {
    modulus: String,
    num_limbs: usize,
    is_field: Option<bool>,
}

fn get_modulus(m: &str) -> Result<BigInt, String> {
    let result = if m.starts_with("0x") {
        let (_, hex) = m.split_at(2);

        BigInt::from_str_radix(hex, 16)
            .map_err(|_| "Failed to parse modulus as hexadecimal value".to_owned())?
    } else {
        BigInt::from_str_radix(m, 10)
            .map_err(|_| "Failed to parse modulus as decimal value".to_owned())?
    };

    Ok(result)
}

fn emit_limbs(x: &BigInt, num_limbs: usize) -> TokenStream2 {
    let limbs = x.to_u64_digits().1;

    assert!(limbs.len() <= num_limbs);

    let mut full_limbs = vec![0; num_limbs];

    full_limbs[..limbs.len()].copy_from_slice(&limbs[..]);

    let limbs = full_limbs.iter().map(|x| quote! {#x}).collect::<Vec<_>>();

    quote! {
        [ #(#limbs,)* ]
    }
}

#[proc_macro_derive(BarrettConfig, attributes(barrett_config))]
/// Derive the config for a ring over Z_q using Barrett reductions for
/// multiplication modulo q.
///
/// # Remarks
/// You must specify the `#[barret_config]` attribute after deriving this
/// trait.
///
/// `#[barrett_config]` accepts `modulus`, `num_limbs`, and `is_field` as
/// arguments.
/// * `modulus` (required) - The modulus `q` defining the finite ring. This
/// must be a string literal containing either a decimal or hex number. Hex
/// values are prefixed with `0x`.
/// * `num_limbs` (required) - The number of 64-bit bigint limbs desired to
/// represent Z_q.
/// * is_field (optional) - If `q` is prime, you may set this to true to
/// define `Z_q` as a field. This additionally allows you to compute
/// inverses.
pub fn derive_barrett_config(input: proc_macro::TokenStream) -> TokenStream {
    let input = parse_macro_input!(input);
    let opts = Opts::from_derive_input(&input);

    let Opts {
        num_limbs,
        modulus,
        is_field,
    } = if let Ok(o) = opts {
        o
    } else {
        return quote! {compile_error!("You must specify #[barret_config(modulus = \"1234\", num_limbs = 2)]. Modulus requires either a hex value beginning in '0x' or decimal value. Limbs must be a positive an integer.")}.into();
    };

    let modulus = match get_modulus(&modulus) {
        Err(s) => return quote! { compile_error!(#s) }.into(),
        Ok(m) => m,
    };

    let is_field = is_field.unwrap_or_default();

    let DeriveInput { ident, .. } = input;

    let mut max_limbs = vec![0u64; num_limbs];
    max_limbs[num_limbs - 1] = 0x1 << 63;

    let max_modulus = BigInt::from_slice(num::bigint::Sign::Plus, bytemuck::cast_slice(&max_limbs));

    if modulus > max_modulus {
        let err = format!("Chosen modulus {modulus} exceeds maximum ({max_modulus}) for given limb count {num_limbs}. Either increase the limb count or use a different backend for Fq.");

        return quote! { compile_error!(#err) }.into();
    }

    let one = BigInt::from_u64(1).unwrap();

    let r = (&one << (64 * num_limbs)) / &modulus;
    let s = (&one << (128 * num_limbs)) / &modulus - (&one << (64 * num_limbs)) * &r;
    let t = (&one << (64 * num_limbs)) - &r * &modulus;

    let mod_limbs = emit_limbs(&modulus, num_limbs);
    let r_limbs = emit_limbs(&r, num_limbs);
    let s_limbs = emit_limbs(&s, num_limbs);
    let t_limbs = emit_limbs(&t, num_limbs);

    let ring_path = quote! { sunscreen_math::ring };
    let field_path = quote! { sunscreen_math::field };

    let modulus_div_2 = modulus / 2;
    let mod_div_2_limbs = emit_limbs(&modulus_div_2, num_limbs);

    let impl_field_trait = if is_field {
        quote_spanned! {ident.span()=>
            impl #field_path::FieldConfig for #ident {}
        }
    } else {
        quote! {}
    };

    quote_spanned! {ident.span()=>
        impl #ring_path::BarrettConfig<#num_limbs> for #ident {
            const MODULUS: #ring_path::Uint<#num_limbs> = #ring_path::Uint::from_words(#mod_limbs);
            const MODULUS_DIV_2: #ring_path::Uint<#num_limbs> = #ring_path::Uint::from_words(#mod_div_2_limbs);
            const R: #ring_path::Uint<#num_limbs> = #ring_path::Uint::from_words(#r_limbs);
            const S: #ring_path::Uint<#num_limbs> = #ring_path::Uint::from_words(#s_limbs);
            const T: #ring_path::Uint<#num_limbs> = #ring_path::Uint::from_words(#t_limbs);
        }

        #impl_field_trait
    }.into()
}

#[proc_macro_attribute]
/// This trait auto impls all combinations of borrowed and owned for binary `std::ops`
/// traits.
/// To use this, you must impl `std::ops::Op<&T> for &T` and this macro will auto
/// create the other traits to call your impl by borrowing the rhs or self as appropriate.
///
/// # Limitations:
/// `refify_binary_op` supports binary operations that look like those in std::ops.
/// Namely, the trait must:
/// * Accept a single generic argument for the `Rhs` type.
/// * Have an associated type for its output.
/// * Require you implement a single method.
///
/// # Example
/// ```rust
/// use num::traits::{WrappingAdd, WrappingMul, WrappingNeg, WrappingSub};
/// use std::ops::Add;
/// use sunscreen_math_macros::refify_binary_op;
///
/// pub trait WrappingSemantics:     
///     Copy + Clone + std::fmt::Debug + WrappingAdd + WrappingMul + WrappingSub + WrappingNeg
/// {
/// }
///
/// impl WrappingSemantics for u64 {}
///
/// #[repr(transparent)]
/// #[derive(Clone, Copy, Debug)]
/// pub struct ZInt<T>(T)
/// where
///     T: WrappingSemantics;
///
/// // #[refify_binary_op] attribute goes on impl `Op<&T> for &T` and will generate
/// // trait impls for
/// // * `impl Op<T> for T`
/// // * `impl Op<&T> for T`
/// // * `impl Op<T> for &T`
/// #[refify_binary_op]
/// impl<T> Add<&ZInt<T>> for &ZInt<T>
/// where
/// T: WrappingSemantics,
/// {
///     type Output = ZInt<T>;
///
///     fn add(self, rhs: &ZInt<T>) -> Self::Output {
///         ZInt(self.0.wrapping_add(&rhs.0))
///     }
/// }
/// ```
pub fn refify_binary_op(
    _attr: TokenStream,
    input: proc_macro::TokenStream,
) -> proc_macro::TokenStream {
    let input = parse_macro_input!(input as ItemImpl);
    let generics = &input.generics;
    let self_type = &input.self_ty;
    let trait_name = &input.trait_;
    let impl_items = &input.items;
    let where_clause = &generics.where_clause;

    fn make_error<S: Spanned>(spanned: S, err: &str) -> TokenStream {
        quote_spanned! { spanned.span() => compile_error!(#err) }.into()
    }

    let self_type = if let Type::Reference(self_type) = *self_type.clone() {
        *self_type.elem
    } else {
        return make_error(
            self_type,
            "You must use refify_binary_op on an `impl OpTrait<&MyType> for &MyType`",
        );
    };

    let trait_path = if let Some((_, path, _)) = trait_name {
        path
    } else {
        return make_error(input, "Use refify_binary_op on trait impls");
    };

    // Get the non-reference type argument to the trait.
    let gen_args = &trait_path.segments.iter().last().unwrap().arguments;

    let mut trait_path_segments = vec![];

    for (i, p) in trait_path.segments.iter().enumerate() {
        // Strip the arguments from the last path segment.
        if i == trait_path.segments.len() - 1 {
            let p = p.clone();

            trait_path_segments.push(PathSegment {
                arguments: PathArguments::None,
                ..p
            })
        } else {
            trait_path_segments.push(p.clone());
        }
    }

    let trait_path_segments = Punctuated::from_iter(trait_path_segments);

    let trait_path = Path {
        segments: trait_path_segments.clone(),
        ..trait_path.clone()
    };

    let trait_arg = if let PathArguments::AngleBracketed(args) = gen_args {
        if args.args.len() != 1 {
            return make_error(
                args,
                "refify_binary_op requires a single generic argument on the trait being impl'd",
            );
        }

        if let GenericArgument::Type(t) = &args.args[0] {
            if let Type::Reference(t) = t {
                if let (None, None) = (&t.lifetime, t.mutability) {
                    *t.elem.clone()
                } else {
                    return make_error(t, "refify_binary_op doesn't allow mutable or bounded lifetime references as trait arguments.");
                }
            } else {
                return make_error(
                    t,
                    "refify_binary_op requires you implement the `Op<&T> for &T` variant.",
                );
            }
        } else {
            return make_error(
                &args.args[0],
                "refify_binary_op requires a type argument to op trait",
            );
        }
    } else {
        return make_error(
            gen_args,
            "refify_binary_op requires angle bracket generics on the operation",
        );
    };

    if impl_items.len() != 2 {
        return make_error(
            input,
            "refify_binary_op requires an associated output type and a single fn implementation.",
        );
    }

    let associated_type = if let ImplItem::Type(t) = &impl_items[0] {
        t
    } else {
        return make_error(
            &impl_items[0],
            "expected an associated type for the trait impl",
        );
    };

    let fn_ident = if let ImplItem::Fn(op_fn) = &impl_items[1] {
        &op_fn.sig.ident
    } else {
        return make_error(&impl_items[1], "expected op fn");
    };

    quote_spanned! {input.span()=>
        impl #generics #trait_path<#trait_arg> for #self_type #where_clause {
            #associated_type

            #[inline(always)]
            fn #fn_ident(self, rhs: #trait_arg) -> Self::Output {
                (&self).#fn_ident (&rhs)
            }
        }

        impl #generics #trait_path<&#trait_arg> for #self_type #where_clause {
            #associated_type

            #[inline(always)]
            fn #fn_ident(self, rhs: &#trait_arg) -> Self::Output {
                (&self).#fn_ident (rhs)
            }
        }

        impl #generics #trait_path<#trait_arg> for &#self_type #where_clause {
            #associated_type

            #[inline(always)]
            fn #fn_ident(self, rhs: #trait_arg) -> Self::Output {
                self.#fn_ident (&rhs)
            }
        }

        #input
    }
    .into()
}
