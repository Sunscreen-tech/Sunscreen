use std::ops::{Add, Mul};

pub trait Ring:
    Debug
    + Clone
    + Mul<Self, Output = Self>
    + for<'a> Mul<&'a Self, Output = Self>
    + Add<Self, Output = Self>
    + for<'a> Add<&'a Self, Output = Self>
{
}