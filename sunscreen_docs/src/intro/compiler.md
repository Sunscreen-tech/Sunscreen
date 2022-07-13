# Sunscreen's compiler

Our goal is to make it easy for *any engineer* to write an FHE program. To accomplish this, we've been working to get the API just right (we're always excited to hear feedback from users!). A large part of this was choosing the right language for our compiler&mdash; we chose [Rust](https://www.rust-lang.org/). In addition to having a powerful and expressive type system, Rust is very well suited to cryptography. It's highly performant (like C/C++) *and* safe by design (unlike C/C++). 

Our compiler relies on Microsoft's [SEAL](https://github.com/microsoft/SEAL) library. There are many different types of FHE schemes out there; we've chosen to use the BFV fully homomorphic encryption scheme&mdash;named for the authors (Brakerski-Fan-Vercauteren) who came up with the scheme.
 
