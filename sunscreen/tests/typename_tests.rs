use sunscreen::{
    types::{Type, TypeName, TypeNameInstance, Version},
    TypeName as DeriveTypeName,
};

#[test]
fn derive_typename_example() {
    #[derive(DeriveTypeName)]
    struct Foo {
        _cow: String,
    }

    let test_data = Foo {
        _cow: "moo".to_string(),
    };

    let name = format!("{}::{}", module_path!(), "Foo");
    let version = env!("CARGO_PKG_VERSION");

    let version = Version::parse(version).unwrap();

    let expected = Type {
        name,
        version,
        is_encrypted: false,
    };

    assert_eq!(Foo::type_name(), expected);
    assert_eq!(test_data.type_name_instance(), expected);
}
