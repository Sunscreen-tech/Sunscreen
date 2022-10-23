use seal_fhe::*;
use std::fs::File;
use std::io::Write;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Mutex,
};
use sunscreen_backend::noise_model::{noise_budget_to_noise, noise_to_noise_budget};
use sunscreen_runtime::Params;

mod ops;
use crate::ops::*;

const SAMPLES: usize = 1_000;

pub struct Stats {
    mean: f64,
    min: f64,
    max: f64,
    stddev: f64,
}

fn relative_diff(a: &[f64], b: &[f64]) -> Vec<f64> {
    assert_eq!(a.len(), b.len());

    a.iter().zip(b.iter()).map(|(a, b)| (a - b) / a).collect()
}

fn stats(data: &[f64]) -> Stats {
    let mean = data.iter().fold(0., |sum, x| sum + x) / (data.len() as f64);

    let stddev = data
        .iter()
        .map(|x| {
            let val = x - mean;
            val * val
        })
        .fold(0., |sum, x| sum + x);

    let stddev = f64::sqrt(stddev / (data.len() as f64));

    let min = data.iter().fold(f64::INFINITY, |min, x| f64::min(min, *x));

    let max = data
        .iter()
        .fold(f64::NEG_INFINITY, |max, x| f64::max(max, *x));

    Stats {
        mean,
        min,
        max,
        stddev,
    }
}

pub struct Results {
    output_file: File,
}

impl Results {
    pub fn new() -> Self {
        let mut output_file = File::options()
            .create(true)
            .write(true)
            .open("Results.csv")
            .unwrap();

        writeln!(
            output_file,
            "λ,d,p,op,op_valid,N_a,N_b,measured_std,actual_mean,actual_min,actual_max,model_std,model_mean,model_min,model_max,diff_std,diff_mean,diff_min,diff_max"
        )
        .unwrap();

        Self { output_file }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn output_row(
        &mut self,
        params: &Params,
        op: &str,
        op_valid: bool,
        n_a: Option<f64>,
        n_b: Option<f64>,
        acutal: &Stats,
        modeled: &Stats,
        diff: &Stats,
    ) {
        let n_a = n_a.map(|x| x.to_string()).unwrap_or_else(|| "".to_owned());
        let n_b = n_b.map(|x| x.to_string()).unwrap_or_else(|| "".to_owned());

        let security_level = match params.security_level {
            SecurityLevel::TC128 => 128,
            SecurityLevel::TC192 => 192,
            SecurityLevel::TC256 => 256,
        };

        writeln!(
            self.output_file,
            "{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
            security_level,
            params.lattice_dimension,
            params.plain_modulus,
            op,
            op_valid,
            n_a,
            n_b,
            acutal.stddev,
            acutal.mean,
            acutal.min,
            acutal.max,
            modeled.stddev,
            modeled.mean,
            modeled.min,
            modeled.max,
            diff.stddev,
            diff.mean,
            diff.min,
            diff.max
        )
        .unwrap();
    }
}

impl Default for Results {
    fn default() -> Self {
        Self::new()
    }
}

static NUM_TASKS: AtomicUsize = AtomicUsize::new(0);
static COMPLETED_TASKS: AtomicUsize = AtomicUsize::new(0);

fn update() {
    COMPLETED_TASKS.fetch_add(1, Ordering::Relaxed);

    log::info!(
        "{}/{} tasks completed.",
        COMPLETED_TASKS.load(Ordering::Relaxed),
        NUM_TASKS.load(Ordering::Relaxed)
    );
}

fn main() {
    env_logger::init();

    let results = Mutex::new(Results::new());

    rayon::scope(|scope| {
        for security_level in [
            SecurityLevel::TC128,
            SecurityLevel::TC192,
            SecurityLevel::TC256,
        ] {
            for lattice_dimension in [1_024, 2_048, 4_096, 8_192, 16_384] {
                for plain_modulus in [2, 128, 1_024, 16_384, 131_072] {
                    let results_ref = &results;
                    scope.spawn(move |scope| {
                        NUM_TASKS.fetch_add(1, Ordering::Relaxed);
                        let stats = encryption_noise(
                            results_ref,
                            lattice_dimension,
                            plain_modulus,
                            security_level,
                        );
                        update();

                        let mut n_a = if lattice_dimension > 4_096 {
                            // Fudge factor in case noise level not in samples
                            noise_budget_to_noise(noise_to_noise_budget(stats.max) - 2f64)
                        } else {
                            stats.max
                        };

                        let noise_margin_increment_bits = noise_to_noise_budget(n_a) / 3.;

                        for _ in 0..3 {
                            let mut n_b = n_a;

                            for _ in 0..3 {
                                NUM_TASKS.fetch_add(1, Ordering::Relaxed);
                                scope.spawn(move |_| {
                                    add_noise(
                                        results_ref,
                                        n_a,
                                        n_b,
                                        lattice_dimension,
                                        plain_modulus,
                                        security_level,
                                    );
                                    update();
                                });

                                NUM_TASKS.fetch_add(1, Ordering::Relaxed);
                                scope.spawn(move |_| {
                                    add_pt_noise(
                                        results_ref,
                                        n_a,
                                        lattice_dimension,
                                        plain_modulus,
                                        security_level,
                                    );
                                    update();
                                });

                                NUM_TASKS.fetch_add(1, Ordering::Relaxed);
                                scope.spawn(move |_| {
                                    mul_noise(
                                        results_ref,
                                        n_a,
                                        n_b,
                                        lattice_dimension,
                                        plain_modulus,
                                        security_level,
                                    );
                                    update();
                                });

                                NUM_TASKS.fetch_add(1, Ordering::Relaxed);
                                scope.spawn(move |_| {
                                    mul_pt_noise(
                                        results_ref,
                                        n_a,
                                        lattice_dimension,
                                        plain_modulus,
                                        security_level,
                                    );
                                    update();
                                });

                                if noise_to_noise_budget(n_b) <= noise_margin_increment_bits {
                                    break;
                                }

                                n_b = noise_budget_to_noise(
                                    noise_to_noise_budget(n_b) - noise_margin_increment_bits,
                                );
                            }

                            if noise_to_noise_budget(n_a) <= noise_margin_increment_bits {
                                break;
                            }

                            n_a = noise_budget_to_noise(
                                noise_to_noise_budget(n_a) - noise_margin_increment_bits,
                            );
                        }
                    });
                }
            }
        }
    });
}
