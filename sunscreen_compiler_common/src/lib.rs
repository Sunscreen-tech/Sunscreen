#![deny(missing_docs)]
#![deny(rustdoc::broken_intra_doc_links)]

//! This crate contains common types and infrastructure for Sunscreen's
//! compilers.

mod context;
mod graph;
/**
 * A set of generic compiler transforms.
 */
pub mod transforms;

pub use context::*;
pub use graph::*;

use semver::Version;
use serde::{
    de::{self, Error, Visitor},
    Deserialize, Deserializer, Serialize, Serializer,
};

use core::hash::Hash;
use std::fmt::Debug;
use std::str::FromStr;

/**
 * Renders this object into a format that can be viewed by external
 * tooling (e.g. DotViz, HTML, etc.)
 */
pub trait Render {
    /**
     * Render this object into a visual representation.
     */
    fn render(&self) -> String;
}

/**
 * A supertrait that concisely contains all the traits needed to serve
 * as an operation for [`NodeInfo`](crate::context::NodeInfo).
 *
 * Also provides functions that describe properties of an operation.
 */
pub trait Operation: Clone + Copy + Debug + Hash + PartialEq + Eq {
    /**
     * Whether or not this operation commutes.
     */
    fn is_commutative(&self) -> bool;

    /**
     * Whether or not this operation has 2 operands.
     */
    fn is_binary(&self) -> bool;

    /**
     * Whether or not this operation has 1 operand.
     */
    fn is_unary(&self) -> bool;
}

/**
 * A type which represents the fully qualified name and version of a datatype.
 */
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Type {
    /**
     * The fully qualified name of the type (including crate name)
     */
    pub name: String,

    /**
     * The semantic version of this type.
     */
    pub version: Version,

    /**
     * Whether or not the type is encrypted.
     */
    pub is_encrypted: bool,
}

impl Serialize for Type {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let type_string = format!("{},{},{}", self.name, self.version, self.is_encrypted);

        serializer.serialize_str(&type_string)
    }
}

struct TypeNameVisitor;

impl<'de> Visitor<'de> for TypeNameVisitor {
    type Value = String;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(formatter, "A string of the form foo::bar::Baz,1.2.3,false")
    }

    fn visit_str<E>(self, s: &str) -> std::result::Result<Self::Value, E>
    where
        E: de::Error,
    {
        let splits: Vec<&str> = s.split(',').collect();

        if splits.len() != 3 {
            Err(de::Error::invalid_value(de::Unexpected::Str(s), &self))
        } else if Version::parse(splits[1]).is_err() {
            Err(de::Error::invalid_value(
                de::Unexpected::Str(splits[1]),
                &self,
            ))
        } else if bool::from_str(splits[2]).is_err() {
            Err(de::Error::invalid_value(
                de::Unexpected::Str(splits[2]),
                &self,
            ))
        } else {
            Ok(s.to_owned())
        }
    }
}

impl<'de> Deserialize<'de> for Type {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let type_string = deserializer.deserialize_string(TypeNameVisitor)?;

        let mut splits = type_string.split(',');
        let typename = splits.next().ok_or_else(|| D::Error::custom("Malformed `Type`: missing name."))?;
        let version = Version::parse(splits.next().ok_or_else(|| D::Error::custom("Malformed `Type`: missing version."))?)
            .map_err(|e| de::Error::custom(format!("Failed to parse version: {}", e)))?;

        let is_encrypted = bool::from_str(splits.next().ok_or_else(|| D::Error::custom("Malformed `Type`: missing is_encrypted."))?)
            .map_err(|e| de::Error::custom(format!("Failed to parse boolean: {}", e)))?;

        Ok(Self {
            name: typename.to_owned(),
            version,
            is_encrypted,
        })
    }
}

/**
 * A trait the gives a name an version to a given type
 */
pub trait TypeName {
    /**
     * Returns the [`Type`] of the `&self`. Lives only on the instance so you can be object-safe
     * for use in `dyn TypeName`.
     */
    fn type_name() -> Type;
}

impl<T, const N: usize> TypeName for [T; N]
where
    T: TypeName,
{
    fn type_name() -> Type {
        let inner_type = T::type_name();

        Type {
            name: format!("[{};{}]", inner_type.name, N),
            ..inner_type
        }
    }
}
