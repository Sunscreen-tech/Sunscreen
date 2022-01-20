use sunscreen_compiler::{
    crate_version,
    types::{Type, TypeName, TypeNameInstance, Version},
};
use sunscreen_compiler_macros::TypeName;

#[test]
fn derive_typename_example() {
    #[derive(TypeName)]
    struct Foo {
        _cow: String,
    }

    let foo = Foo {
        _cow: "moo".to_string(),
    };

    let name = format!("{}::{}", module_path!(), "Foo");
    let version = Version::parse(crate_version!()).unwrap();

    let expected = Type {
        name,
        version,
        is_encrypted: false,
    };

    assert_eq!(Foo::type_name(), expected);
    assert_eq!(foo.type_name_instance(), expected);
}
