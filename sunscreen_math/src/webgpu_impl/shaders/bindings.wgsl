@group(0) @binding(0) var<storage, read> g_a : array<u32>;
@group(0) @binding(1) var<storage, read> g_b : array<u32>;
@group(0) @binding(2) var<storage, read_write> g_c : array<u32>;
@group(0) @binding(3) var<storage, read_write> g_len : u32;