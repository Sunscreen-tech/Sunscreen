


fn main() {
    /*
    println!("cargo:rerun-if-changed=fhe-debugger-frontend");

    let out_dir = std::env::var("OUT_DIR").unwrap();
    let out_dir_frontend = PathBuf::from(&out_dir).join("fhe-debugger-frontend");

    println!("{:?}", out_dir_frontend);
    let _ = copy_dir::copy_dir("fhe-debugger-frontend", &out_dir_frontend);

    let output = Command::new("npm")
        .arg("install")
        .current_dir(&out_dir_frontend)
        .output()
        .unwrap();
    if !output.status.success() {
        panic!()
    }

    let output = Command::new("node")
        .arg("node_modules/react-scripts/bin/react-scripts.js")
        .arg("build")
        .current_dir(&out_dir_frontend)
        .output()
        .unwrap();

    if !output.status.success() {
        println!("{}", String::from_utf8_lossy(&output.stderr));
        panic!()
    }
    */
}
