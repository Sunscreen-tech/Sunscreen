/**
 * Running mean and variance calculation.
 */
#[derive(Debug, PartialEq, Default, Clone, Copy)]
pub struct RunningMeanVariance {
    mean: f64,
    variance: f64,
    k: usize,
}

impl RunningMeanVariance {
    /**
     * Create a new running mean and variance calculator.
     */
    pub fn new() -> Self {
        Self {
            mean: 0.0,
            variance: 0.0,
            k: 0,
        }
    }

    /**
     * Add a sample to the running mean and variance calculator.
     */
    pub fn add_sample(&mut self, x: f64) {
        if self.k == 0 {
            self.mean = x;
            self.variance = 0.0;

            self.k += 1;
        } else {
            // https://math.stackexchange.com/a/116344
            self.k += 1;

            let new_mean = self.mean + (x - self.mean) / (self.k as f64);
            let new_variance = self.variance + (x - self.mean) * (x - new_mean);

            self.mean = new_mean;
            self.variance = new_variance;
        }
    }

    /**
     * Get the mean of the samples.
     */
    pub fn mean(&self) -> f64 {
        self.mean
    }

    /**
     * Get the variance of the samples.
     */
    pub fn variance(&self) -> f64 {
        self.variance / (self.k as f64)
    }

    /**
     * Get the standard deviation of the samples.
     */
    pub fn std(&self) -> f64 {
        self.variance().sqrt()
    }
}
