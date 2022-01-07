mod keys;

use keys::*;

pub const POLY_DEGREE: &[u64] = &[1024, 2048, 4096, 8192, 16384, 32768];

fn main() {
    let mut table = key_size_table();
    table.load_preset(comfy_table::presets::ASCII_MARKDOWN);

    println!("{}", table);
}
