mod keys;
mod texts;

use keys::*;
use si_scale::{prelude::*, scale_fn};

pub const POLY_DEGREE: &[u64] = &[1024, 2048, 4096, 8192, 16384, 32768];

scale_fn!(bibytes1,
    base: B1024,
    constraint: UnitAndAbove,
    mantissa_fmt: "{:.2}",
    groupings: ',',
    unit: "B"
);

fn main() {
    println!("Running key sizes...");

    let mut table = key_size_table();
    table.load_preset(comfy_table::presets::ASCII_MARKDOWN);
    
    println!("{}", table);

    println!("Running text sizes...");
    let mut table = texts::texts_table();

    table.load_preset(comfy_table::presets::ASCII_MARKDOWN);
    println!("{}", table);
}
