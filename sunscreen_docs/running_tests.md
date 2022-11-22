Running our book's tests is a dark art that requires a custom build of mdbook (until our changes get accepted upstream).

# Build custom mdbook
Clone and build mdbook in the parent directory of this project.

```
cd ..
git clone git@github.com:rickwebiii/mdBook.git
cd mdBook
git checkout rweber/extern
cargo build --release
```

# Build sunscreen
Build sunscreen (do this from your Sunscreen repo)

```
cargo build --release --package sunscreen --package bincode
```

# Run the tests
```
../mdBook/target/release/mdbook test -L dependency=/Users/rickweber/Projects/Sunscreen/target/release/deps --extern sunscreen=/Users/rickweber/Projects/Sunscreen/target/release/libsunscreen.rlib --extern bincode=/Users/rickweber/Projects/Sunscreen/target/release/libbincode.rlib
```

