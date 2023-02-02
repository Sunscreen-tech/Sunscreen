#include <field.hpp.metal>

FieldElement2625 FieldElement2625::unpack(device const u32* ptr, const size_t grid_tid, const size_t n) {
    FieldElement2625 a;

    for (size_t i = 0; i < 10; i++) {
        a[i] = ptr[i * n + grid_tid];
    }

    return a;
}

void FieldElement2625::pack(device u32* ptr, const size_t grid_tid, const size_t n) {
    for (size_t i = 0; i < 10; i++) {
        ptr[i * n + grid_tid] = (*this)[i];
    }
}