use sunscreen_compiler::{crate_version, types::{Type, TypeName, Version}};
use sunscreen_compiler_macros::{TypeName};

#[test]
fn derive_typename_example() {
    #[derive(TypeName)]
    struct Foo {
        _cow: String,
    }

    let _ = Foo { _cow: "moo".to_string() };

    let name = format!("{}::{}", module_path!(), "Foo");
    let version = Version::parse(crate_version!()).unwrap();

    assert_eq!(Foo::type_name(), Type { name, version })
}