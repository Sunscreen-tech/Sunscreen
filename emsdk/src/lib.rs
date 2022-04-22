use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

pub struct Config {
    defines: HashMap<String, String>,
    emcc_args: Vec<String>,
    path: PathBuf,
}

impl Config {
    pub fn new<P: AsRef<Path>>(path: P) -> Self {
        Self {
            path: path.as_ref().to_owned(),
            defines: HashMap::new(),
            emcc_args: vec![],
        }
    }

    pub fn define(mut self, k: &str, v: &str) -> Self {
        self.defines.insert(k.to_owned(), v.to_owned());
        self
    }

    pub fn emcc_arg(mut self, arg: &str) -> Self {
        self.emcc_args.push(arg.to_owned());
        self
    }

    pub fn build(self) -> PathBuf {
        let emsdk_out_dir = PathBuf::from(env!("OUT_DIR"));
        let output_directory = PathBuf::from(std::env::var("OUT_DIR").unwrap());

        let emsdk_dir = emsdk_out_dir.join("emsdk");

        let script_path = output_directory.join("build.sh");
        let mut script = std::fs::File::create(&script_path).unwrap();

        let build_dir = output_directory.join("build");

        if build_dir.exists() {
            //std::fs::remove_dir_all(&build_dir).unwrap();
        }

        let bin_dir = emsdk_dir.join("bin");
        let emscipten_bin_dir = emsdk_out_dir.join("emscripten");

        //writeln!(script, "export PATH={}:{}:$PATH", bin_dir.to_str().unwrap(), emscipten_bin_dir.to_str().unwrap()).unwrap();
        writeln!(script, "set -e").unwrap();
        writeln!(script, "{}", self.get_cmake_command(&build_dir)).unwrap();
        writeln!(script, "emmake make -C {:#?} -j", build_dir).unwrap();
        //writeln!(script, "{}", self.get_emcc_command()).unwrap();

        let status = Command::new("bash")
            .arg(script_path)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap()
            .wait()
            .unwrap();

        if !status.success() {
            panic!("Compilation failed");
        }

        build_dir.to_owned()
    }

    fn get_cmake_command(&self, build_dir: &Path) -> String {
        let mut args = vec![
            "emcmake".to_owned(),
            "cmake".to_owned(),
            "-S".to_owned(),
            self.path.to_str().unwrap().to_owned(),
            "-B".to_owned(),
            build_dir.to_str().unwrap().to_owned(),
        ];

        for (k, v) in &self.defines {
            args.push(format!("-D{}=\"{}\"", k, v.to_owned()));
        }

        args.join(" ")
    }

    fn get_emcc_command(&self) -> String {
        let mut args = vec!["emcc"];

        for i in &self.emcc_args {
            args.push(i);
        }

        args.join(" ")
    }
}
