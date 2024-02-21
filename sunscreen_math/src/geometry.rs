/// A 2D point.
#[derive(Debug, Clone, Copy)]
pub struct Point2D {
    x: f64,
    y: f64,
}

impl Point2D {
    /// Create a new 2D point.
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    /// The x-coordinate of the point.
    pub fn x(&self) -> f64 {
        self.x
    }

    /// The y-coordinate of the point.
    pub fn y(&self) -> f64 {
        self.y
    }
}

/// A half-space in 2D space. It is defined by a normal vector `a` and a scalar
/// `b`. The half-space is the set of points `x` such that `a * x <= b`.
#[derive(Debug, Clone, Copy)]
pub struct HalfSpace2D {
    a: (f64, f64),
    b: f64,
}

impl HalfSpace2D {
    /// Create a new half-space.
    pub fn new(a: (f64, f64), b: f64) -> Self {
        Self { a, b }
    }

    /// Is a point inside the half-space?
    pub fn inside(&self, point: Point2D) -> bool {
        self.a.0 * point.x + self.a.1 * point.y <= self.b
    }
}

/// A convex polytope in 2D space. It is defined by a set of half-spaces. There
/// is no function to convert to the vertices representation.
#[derive(Debug, Clone)]
pub struct ConvexPolytope2D {
    pub(crate) half_spaces: Vec<HalfSpace2D>,
}

impl ConvexPolytope2D {
    /// Create a new convex polytope.
    pub fn new(half_spaces: &[HalfSpace2D]) -> Self {
        Self {
            half_spaces: half_spaces.to_owned(),
        }
    }

    /// Is a point inside the polytope?
    pub fn inside(&self, point: Point2D) -> bool {
        self.half_spaces
            .iter()
            .all(|half_space| half_space.inside(point))
    }

    /// The half-spaces that a point violates.
    pub fn violations(&self, point: Point2D) -> Vec<HalfSpace2D> {
        self.half_spaces
            .iter()
            .filter_map(|half_space| {
                if half_space.inside(point) {
                    None
                } else {
                    Some(*half_space)
                }
            })
            .collect()
    }

    /// The half-spaces of the polytope.
    pub fn half_spaces(&self) -> &[HalfSpace2D] {
        &self.half_spaces
    }
}
