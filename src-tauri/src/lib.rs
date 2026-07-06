mod audit;
mod rng;

use audit::AuditReport;
use rng::{RollRequest, RollResult};

#[tauri::command]
fn roll_many(requests: Vec<RollRequest>) -> Result<Vec<RollResult>, String> {
    requests.iter().map(rng::roll_request).collect()
}

#[tauri::command]
fn simulate_audit(sides: u32, rolls: u32) -> Result<AuditReport, String> {
    audit::run_audit(sides, rolls)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![roll_many, simulate_audit])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
