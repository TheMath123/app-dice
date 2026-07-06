//! Fonte da verdade sobre aleatoriedade: todo resultado de dado é decidido
//! aqui, usando o CSPRNG do sistema operacional. A cena 3D no frontend
//! apenas anima visualmente até o valor que este módulo já sorteou.
//!
//! O resultado de qualquer dado (padrão ou customizado) é sempre uma
//! `String`: dados padrão convertem o número sorteado para texto; dados
//! customizados podem ter faces com texto livre (letras, símbolos, etc.).

use rand::rngs::OsRng;
use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum DieSpec {
    Standard { sides: u32 },
    Custom { values: Vec<String> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RollRequest {
    pub id: String,
    #[serde(flatten)]
    pub spec: DieSpec,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RollResult {
    pub id: String,
    pub value: String,
    pub face_index: u32,
}

/// Sorteia apenas o índice (0..sides) via CSPRNG do SO, sem alocar String —
/// usado tanto por `roll_standard` quanto pela auditoria estatística, que
/// chama isso em massa (até milhões de vezes) e não precisa do texto.
pub fn roll_standard_index(sides: u32) -> Result<u32, String> {
    if sides < 2 {
        return Err("um dado precisa de pelo menos 2 lados".into());
    }
    Ok(OsRng.gen_range(0..sides))
}

/// Sorteia 1..=sides usando o CSPRNG do SO. `gen_range` do crate `rand` já
/// evita viés de módulo internamente (Lemire's method) — não reinventar.
pub fn roll_standard(sides: u32) -> Result<(String, u32), String> {
    let face_index = roll_standard_index(sides)?;
    Ok(((face_index + 1).to_string(), face_index))
}

pub fn roll_custom(values: &[String]) -> Result<(String, u32), String> {
    if values.is_empty() {
        return Err("um dado customizado precisa de ao menos um valor".into());
    }
    let face_index = OsRng.gen_range(0..values.len() as u32);
    Ok((values[face_index as usize].clone(), face_index))
}

pub fn roll_spec(spec: &DieSpec) -> Result<(String, u32), String> {
    match spec {
        DieSpec::Standard { sides } => roll_standard(*sides),
        DieSpec::Custom { values } => roll_custom(values),
    }
}

pub fn roll_request(req: &RollRequest) -> Result<RollResult, String> {
    let (value, face_index) = roll_spec(&req.spec)?;
    Ok(RollResult {
        id: req.id.clone(),
        value,
        face_index,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use statrs::distribution::{ChiSquared, ContinuousCDF};
    use std::collections::HashSet;

    /// Roda `rolls` sorteios de um dado de `sides` lados e retorna o
    /// p-valor do teste qui-quadrado de aderência à distribuição uniforme.
    /// p-valor baixo (perto de 0) indicaria viés estatisticamente
    /// detectável na distribuição de resultados.
    fn chi_square_p_value(sides: u32, rolls: u32) -> f64 {
        let mut counts = vec![0u32; sides as usize];
        for _ in 0..rolls {
            let (_, idx) = roll_standard(sides).unwrap();
            counts[idx as usize] += 1;
        }
        let expected = rolls as f64 / sides as f64;
        let chi_sq: f64 = counts
            .iter()
            .map(|&c| {
                let diff = c as f64 - expected;
                diff * diff / expected
            })
            .sum();
        let dist = ChiSquared::new((sides - 1) as f64).unwrap();
        1.0 - dist.cdf(chi_sq)
    }

    #[test]
    fn d6_is_statistically_uniform() {
        let p = chi_square_p_value(6, 60_000);
        assert!(p > 0.001, "p-valor suspeito para d6: {p}");
    }

    #[test]
    fn d20_is_statistically_uniform() {
        let p = chi_square_p_value(20, 100_000);
        assert!(p > 0.001, "p-valor suspeito para d20: {p}");
    }

    #[test]
    fn d100_is_statistically_uniform() {
        let p = chi_square_p_value(100, 200_000);
        assert!(p > 0.001, "p-valor suspeito para d100: {p}");
    }

    #[test]
    fn rejects_dice_with_fewer_than_two_sides() {
        assert!(roll_standard(1).is_err());
        assert!(roll_standard(0).is_err());
    }

    #[test]
    fn rejects_empty_custom_die() {
        assert!(roll_custom(&[]).is_err());
    }

    #[test]
    fn custom_die_can_produce_every_value() {
        let values: Vec<String> = ["-5", "0", "sete", "★42★"].iter().map(|s| s.to_string()).collect();
        let mut seen = HashSet::new();
        for _ in 0..5000 {
            let (v, _) = roll_custom(&values).unwrap();
            seen.insert(v);
        }
        assert_eq!(seen, values.into_iter().collect());
    }

    #[test]
    fn roll_request_preserves_id() {
        let req = RollRequest {
            id: "die-1".into(),
            spec: DieSpec::Standard { sides: 6 },
        };
        let result = roll_request(&req).unwrap();
        assert_eq!(result.id, "die-1");
        let v: i64 = result.value.parse().unwrap();
        assert!(v >= 1 && v <= 6);
    }
}
