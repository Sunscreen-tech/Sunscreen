#include <ristretto.hpp.metal>

// Note: N must be >= 1.
template <size_t N> class LookupTable {
private:
    ProjectiveNielsPoint _entries[N];

public:
    LookupTable(const RistrettoPoint p) {
        _entries[0] = p.as_projective_niels();

        for (size_t i = 1; i < N; i++) {
            _entries[i] = (p + _entries[i - 1]).as_extended().as_projective_niels();
        }
    }

    // TODO: Eventually make this non vartime.
    thread ProjectiveNielsPoint select(size_t x) {
        if (x == 0) {
            return ProjectiveNielsPoint::IDENTITY;
        } else {
            return _entries[x - 1];
        }
    }
};