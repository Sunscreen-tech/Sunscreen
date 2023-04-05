#pragma once
#include <ristretto.hpp.cu>

using namespace metal;

// Note: N must be >= 1.
template <size_t N> class LookupTable {
private:
    ProjectiveNielsPoint _entries[N];

public:
    LookupTable(const thread RistrettoPoint& p) {
        _entries[0] = p.as_projective_niels();

        for (size_t i = 1; i < N; i++) {
            _entries[i] = (p + _entries[i - 1]).as_extended().as_projective_niels();
        }
    }

    // TODO: Eventually make this non vartime. Or not, as Sunscreen doesn't require it.
    thread ProjectiveNielsPoint select(i8 x) {
        ProjectiveNielsPoint ret = ProjectiveNielsPoint::IDENTITY;

        size_t idx = abs(x);

        ret = x > 0 ? _entries[idx - 1] : ret;
        ret = x < 0 ? -_entries[idx - 1] : ret;

        return ret;
    }
};