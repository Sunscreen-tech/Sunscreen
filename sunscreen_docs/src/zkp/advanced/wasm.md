# WASM support

Need to run Sunscreen in your browser or NodeJS app? Simply build your app targeting WebAssembly (WASM).

WASM is an instruction set for a sandboxed virtual machine that allows you to safely run Rust code in your browser more efficiently than Javascript. This includes your Sunscreen app!

Rust features multiple targets for building WASM binaries, but Sunscreen currently only supports `wasm32-unknown-emscripten`. As the name suggests, this leverages [emscripten](https://emscripten.org/).[^*]  

[^*]: We intend to package our FHE and ZKP compilers together. Our FHE compiler is built on top of Microsoft SEAL which needs emscripten during compilation and runtime.

## Setup
### Install emscripten

```sh
git clone https://github.com/emscripten-core/emsdk.git
emsdk/emsdk install 3.1.3
emsdk/emsdk activate 3.1.3
```

You can try installing other toolchain versions if you wish, but we've seen the compiler seg fault and other strange errors when building our examples 🙃.

### Load the emscripten environment

```sh
source emsdk/emsdk_env.sh
```

Put this command in your shell's .rc file so you don't need to rerun it each time you launch a shell.
 
### Add the `wasm32-unknown-emscripten` target to Rust
```sh
rustup target add wasm32-unknown-emscripten
```

## Building
To compile your program with Rust+emscripten, you'll need to do a few extra things.

### Required emscripten features
Add the following lines to your `.cargo/config.toml`[^1]:

```toml
[env]
EMCC_CFLAGS = "-sERROR_ON_UNDEFINED_SYMBOLS=0 -sDISABLE_EXCEPTION_CATCHING=0 -sALLOW_MEMORY_GROWTH"
```

`ERROR_ON_UNDEFINED_SYMBOLS=0` works around a [known issue](https://github.com/rust-lang/rust/pull/95950) when Rust's panic handling is set to `unwind` (the default). Alternatively, you can [set the handling mode to `abort`](https://doc.rust-lang.org/rustc/codegen-options/index.html#panic) when building for WASM.

`DISABLE_EXCEPTION_CATCHING=0` allows C++ code to catch exceptions. Without this, you'll get an error complaining that Rust can't catch foreign exceptions and your application will terminate via `abort()`.

Finally, `ALLOW_MEMORY_GROWTH` allows the heap to resize. Without this, your app will quickly run out of memory and seg fault.

[^1]: This is *not* your `Cargo.toml` file! Put the `.cargo` directory at the root of your git repository and commit it.

## Building your app

Simply run:

```sh
cargo build --bin myapp --release --target wasm32-unknown-emscripten
```
where `myapp` is the name of your executable.

On success, you should see the following files:

```ignore
target/wasm32-unknown-emscripten/release/myapp.js
target/wasm32-unknown-emscripten/release/myapp.wasm
```

### Running with node 

```sh
node target/wasm32-unknown-emscripten/release/myapp.js
```

### Running in browser

Put `myapp.js` in a script tag in an `index.html` file:
```html
<!DOCTYPE html>
<html>
    <head>
        <script src="myapp.js"></script>
    </head>
    <body></body>
</html>
```

and serve the `index.html`, `myapp.js`, and `myapp.wasm` files on a web server. Your app will run when the user loads the page in their browser.

Alternatively, you can bundle your `.js` and `.wasm` into a larger application with `webpack`.

### Running with wasmer/wasmtime

Unfortunately, these scenarios are currently unsupported 😞.

## Running tests

Build your tests with:

```sh
cargo test --no-run --release --target wasm32-unknown-emscripten
```

You'll find your tests' entry points in `target/wasm32-unknown-emscripten/release/deps/*.js`. Simply select the desired test and run:

```sh
node target/wasm32-unknown-emscripten/release/mytest-xxxx.js
```

## Debugging

Debugging WASM is challenging. If possible, you should debug issues running your app natively. For debugging WASM-specific issues, emscripten can emit both DWARF symbols and traditional source maps. While DWARF symbols are more useful, browser support at this stage is terrible.

### Build in debug mode

To use source maps, simply build in debug mode[^2]:
```sh
cargo build --bin myapp --target wasm32-unknown-emscripten
```

where `myapp` is the name of your executable.

[^2]: You may wish to add `-O3` to `EMCC_CFLAGS` to speed up your app.

### Make a webpage

In our experiments debugging with `node --inspect-brk`, the Chrome debugger failed to find the source maps. Debugging raw WASM is unpleasant, so we recommend an alternative &mdash; make a simple webpage that hosts your app.

Make an `index.html` with the following contents in the root of your git repository:

```html
<!DOCTYPE html>
<html>
    <head>
        <script src="./target/wasm32-unknown-emscripten/debug/myapp.js"></script>
    </head>
    <body></body>
</html>
```

### Serve your page

In another terminal, run:

```sh
npm install -g http-server
node http-server /git/repo/root/dir
```

### Debug your program on the website

Open Chrome and navigate to `http://localhost:8080/index.html`. Hit F12 to open the debugger. Chrome should find your source maps allowing you to navigate the stack, set breakpoints, step, continue, etc. all with real source code. Unfortunately, you can't see variables.

You can also use the `log` crate to print information to the debug console. If you go this route, use `simple-logger` as the logger backend; don't use a WASM-specific crate (e.g. `wasm-logger`) for this because emscripten already routes stdout and stderr to the console.
