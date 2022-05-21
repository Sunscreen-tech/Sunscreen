# Installation

Using Sunscreen in your app no different than any other Rust crate.

Simply add

```toml
sunscreen = "0.5.0"
```

to your application's Cargo.toml `[dependencies]` section.

You also need cmake, clang, and a C++ compiler toolchain installed on your machine and visible in your `$PATH`. If you have ever built any other crate that wraps a C++ library, you may already be done.

## Linux
### Using Yum (e.g. CentOS)
In your terminal, run

```sh
sudo yum install cmake3 clang git
```

#### Use `gcc10-g++` as your compiler
In some distros (e.g Amazon Linux), the default compiler (i.e. gcc7 from the `gcc-c++` package), crashes when building SEAL. If `g++ --version` yields version 7, you need to install and use gcc10.

Run

```sh
sudo yum install gcc10 gcc10-c++
```

then

```sh
export CC=/usr/bin/gcc10-gcc
export CXX=/usr/bin/gcc10-g++
```

before building your application with Cargo. You may wish to add these `exports` to your shell's rc file (e.g. `~/.bash_profile`).

### Using Apt (e.g. Debian)
```sh
sudo apt install build-essential cmake3 clang git
```

On some distros (e.g. Ubuntu), the cmake package is already version 3 and you can just use it directly.

### Alias `cmake3` as cmake

Then, make `cmake3` appear in your `$PATH` as `cmake`. A simple way to do this is run
```sh
sudo ln /usr/bin/cmake3 /usr/bin/cmake
```

However, this globally creates a hard link for all users and may conflict with also installing the `cmake` (CMake 2.x) package. As an alternative, you can simply create the hard link or symlink somewhere under your `$PATH` with higher search precedence than `/usr/bin`.

## MacOS
### Using Brew
```sh
brew install cmake git
```

When you first attempt to build your application, MacOS will prompt you to install the command-line developer tools. Do this.

## Windows
### Install Rust toolchain
Install the [MSVC C++ toolchain](https://aka.ms/vs/17/release/vs_BuildTools.exe)

When prompted for what to install, ensure you additionally check the *Windows 10 SDK*. You'll need to rerun the tool and modify your installation if you forget to do this.

Install [Rustup](https://win.rustup.rs/x86_64). Run the executable and hit return a bunch of times to accept the default options.

### Cmake
Install [cmake 3](https://github.com/Kitware/CMake/releases/download/v3.23.0-rc2/cmake-3.23.0-rc2-windows-x86_64.msi).

When prompted, add cmake to either the system or user path. You can also do this later by editing your system's environment variables.

### Clang
Install [llvm+clang](https://github.com/llvm/llvm-project/releases/download/llvmorg-13.0.0/LLVM-13.0.0-win64.exe). In the installer, select the option to add LLVM to your `%PATH%`. If you forget to do check this option, add `C:\Program Files\LLVM\bin` to your `%PATH%`.

### git
Install [git](https://git-scm.com/download/win). Defaults are fine.

# Crate features
Sunscreen supports the following [crate features](https://doc.rust-lang.org/cargo/reference/features.html#dependency-features):
* `hexl` &mdash; Speeds up FHE operations with [HEXL](https://www.intel.com/content/www/us/en/developer/articles/technical/introducing-intel-hexl.html) on x86_64 processors supporting AVX-512 IMFA instructions. Disabled by default.