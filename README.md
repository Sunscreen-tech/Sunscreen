[![Rust](https://github.com/Sunscreen-tech/Sunscreen/workflows/CI/badge.svg)](https://github.com/Sunscreen-tech/Sunscreen/actions/workflows/rust.yml)

# Intro

Sunscreen is an ecosystem for building privacy-preserving applications using fully homomorphic encryption and zero-knowlege proofs.

*WARNING!* This library is meant for experiments only. It has not been audited and is *not* intended for use in production. 

# Set-up
These directions apply for the requirements to *develop the sunscreen platform itself*, which may be more than needed to merely consume it as a dependency. If you wish to develop an application using Sunscreen, see the installation 

## Install Rust
Install [Rustup](https://rustup.rs/) and follow the directions for your OS. We recommend stable Rust 1.58 or later.

## MacOS
```brew install cmake git```

## Linux
### Install prereqs
Using yum:
```sudo yum install gcc gcc-c++ cmake3 openssl-devel clang git```

Using apt:
```sudo apt install build-essential clang cmake3 libssl-dev git```

After installing prereqs, make a link to `cmake3` named `cmake`
```sudo ln /usr/bin/cmake3 <somwhere/under/$PATH/>cmake```

## Windows
We recommend developing sunscreen on macOS or Linux, as Windows is really slow.

### Cmake
Install [cmake 3](https://github.com/Kitware/CMake/releases/download/v3.23.0-rc2/cmake-3.23.0-rc2-windows-x86_64.msi).

### Clang
Install [llvm+clang](https://github.com/llvm/llvm-project/releases/download/llvmorg-13.0.0/LLVM-13.0.0-win64.exe). In the installer, select the option to add LLVM to your `%PATH%`. If you forget to do check this option, add `C:\Program Files\LLVM\bin` to your `%PATH%`.

### MSVC C++
Install the [MSVC C++ toolchain](https://aka.ms/vs/17/release/vs_BuildTools.exe)

When prompted for what to install, ensure you additionally check the *Windows 10 SDK*. You'll need to rerun the tool and modify your installation if you forget to do this.

### Enable long file paths
Some of our compilation tests produce really long file paths. These tests will fail unless you [enable long file paths](https://www.howtogeek.com/266621/how-to-make-windows-10-accept-file-paths-over-260-characters/). TL;DR; run `regedit.exe`, set `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem` to `1` and reboot.

### git
Install [git](https://git-scm.com/download/win). Defaults are fine.

## Initialize submodules
```
git submodule init
git submodule update
```

# Dev workflows
Working Sunscreen is as you'd expect with any other Rust repository:

## Build
```cargo build```

## Test
```cargo test --release```

## Docs
```cargo doc --open```

## Format
```cargo fmt```

## Debugging
We have a `launch.json` checked in that defines a bunch of debug configurations. In VSCode, you should see a bunch of dropdowns in the debug menu to debug the tests and examples.
