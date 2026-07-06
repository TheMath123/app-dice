//! Auditoria estatística: roda uma rolagem em massa de um dado padrão
//! (usando a mesma fonte de aleatoriedade de `rng.rs`) e aplica um teste
//! qui-quadrado de aderência à distribuição uniforme — prova numérica de
//! que o CSPRNG não favorece nenhuma face.

use crate::rng;
use serde::{Deserialize, Serialize};
use statrs::distribution::{ChiSquared, ContinuousCDF};

/// p-valor abaixo disso é considerado evidência estatística de viés.
const P_VALUE_THRESHOLD: f64 = 0.01;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditReport {
    pub sides: u32,
    pub rolls: u32,
    pub histogram: Vec<u32>,
    pub chi_square: f64,
    pub degrees_of_freedom: u32,
    pub p_value: f64,
    pub passed: bool,
}

pub fn run_audit(sides: u32, rolls: u32) -> Result<AuditReport, String> {
    if rolls == 0 {
        return Err("número de rolagens deve ser maior que zero".into());
    }

    let mut histogram = vec![0u32; sides as usize];
    for _ in 0..rolls {
        let idx = rng::roll_standard_index(sides)?;
        histogram[idx as usize] += 1;
    }

    let expected = rolls as f64 / sides as f64;
    let chi_square: f64 = histogram
        .iter()
        .map(|&count| {
            let diff = count as f64 - expected;
            diff * diff / expected
        })
        .sum();

    let degrees_of_freedom = sides - 1;
    let dist = ChiSquared::new(degrees_of_freedom as f64).map_err(|e| e.to_string())?;
    let p_value = 1.0 - dist.cdf(chi_square);

    Ok(AuditReport {
        sides,
        rolls,
        histogram,
        chi_square,
        degrees_of_freedom,
        p_value,
        passed: p_value > P_VALUE_THRESHOLD,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audit_passes_for_d6() {
        let report = run_audit(6, 60_000).unwrap();
        assert!(report.passed, "p-valor suspeito: {}", report.p_value);
        assert_eq!(report.histogram.len(), 6);
        assert_eq!(report.histogram.iter().sum::<u32>(), 60_000);
    }

    #[test]
    fn audit_passes_for_d20() {
        let report = run_audit(20, 100_000).unwrap();
        assert!(report.passed, "p-valor suspeito: {}", report.p_value);
    }

    #[test]
    fn rejects_zero_rolls() {
        assert!(run_audit(6, 0).is_err());
    }

    #[test]
    fn rejects_invalid_sides() {
        assert!(run_audit(1, 100).is_err());
    }
}
