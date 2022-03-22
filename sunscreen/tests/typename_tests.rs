use sunscreen::{
    crate_version,
    types::{Type, TypeName, TypeNameInstance, Version},
    TypeName as DeriveTypeName,
};

#[test]
fn derive_typename_example() {
    #[derive(DeriveTypeName)]
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
