mod db;
mod error;
mod parser;
mod repo;
mod tiles;
mod types;
mod zones;

use crate::db::init_db;
use crate::error::AppError;
use crate::parser::parse_fit_file;
use crate::repo::{
    delete_activity as repo_delete_activity, get_activity as repo_get_activity,
    get_monthly_summary as repo_get_monthly_summary, get_weekly_summary as repo_get_weekly_summary,
    insert_activity, list_activities as repo_list_activities,
};
use crate::tiles::TileServer;
use crate::types::{Activity, ActivityDetail, ZoneSummary};
use rusqlite::Connection;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

/// Application state holding database connection
pub struct AppState {
    db: Mutex<Connection>,
    tiles: Mutex<TileServer>,
}

#[tauri::command]
fn import_fit_file(path: String, state: State<AppState>) -> Result<Activity, AppError> {
    let parsed = parse_fit_file(&PathBuf::from(&path))?;
    let conn = state.db.lock().unwrap();
    let id = insert_activity(&conn, &parsed)?;

    Ok(Activity {
        id,
        filename: parsed.filename,
        activity_type: parsed.activity_type,
        activity_date: parsed.activity_date.to_string(),
        start_time: parsed.start_time,
        location: parsed.location,
        total_duration: parsed.total_duration,
        zones: parsed.zones,
        elevation_gain: Some(parsed.elevation_gain),
        max_altitude: parsed.max_altitude,
        min_altitude: parsed.min_altitude,
        total_distance: Some(parsed.total_distance),
    })
}

#[tauri::command]
fn list_activities(state: State<AppState>) -> Result<Vec<Activity>, AppError> {
    let conn = state.db.lock().unwrap();
    repo_list_activities(&conn)
}

#[tauri::command]
fn get_activity(id: i64, state: State<AppState>) -> Result<ActivityDetail, AppError> {
    let conn = state.db.lock().unwrap();
    repo_get_activity(&conn, id)
}

#[tauri::command]
fn get_weekly_summary(week_start: String, state: State<AppState>) -> Result<ZoneSummary, AppError> {
    let conn = state.db.lock().unwrap();
    repo_get_weekly_summary(&conn, &week_start)
}

#[tauri::command]
fn get_monthly_summary(month_start: String, state: State<AppState>) -> Result<ZoneSummary, AppError> {
    let conn = state.db.lock().unwrap();
    repo_get_monthly_summary(&conn, &month_start)
}

#[tauri::command]
fn delete_activity(id: i64, state: State<AppState>) -> Result<(), AppError> {
    let conn = state.db.lock().unwrap();
    repo_delete_activity(&conn, id)
}

/// Progress event payload for bulk import
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportProgress {
    file_index: usize,
    total_files: usize,
    filename: String,
    status: String, // "parsing", "saving", "done", "error"
    error: Option<String>,
    activity: Option<Activity>,
}

#[tauri::command]
async fn import_fit_files(
    paths: Vec<String>,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<Vec<Activity>, String> {
    let total = paths.len();
    let mut results: Vec<Activity> = Vec::new();

    for (index, path) in paths.iter().enumerate() {
        let filename = PathBuf::from(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Emit parsing progress
        let _ = app.emit(
            "import-progress",
            ImportProgress {
                file_index: index,
                total_files: total,
                filename: filename.clone(),
                status: "parsing".to_string(),
                error: None,
                activity: None,
            },
        );

        // Parse the file
        let parsed = match parse_fit_file(&PathBuf::from(path)) {
            Ok(p) => p,
            Err(e) => {
                let _ = app.emit(
                    "import-progress",
                    ImportProgress {
                        file_index: index,
                        total_files: total,
                        filename: filename.clone(),
                        status: "error".to_string(),
                        error: Some(e.to_string()),
                        activity: None,
                    },
                );
                continue;
            }
        };

        // Emit saving progress
        let _ = app.emit(
            "import-progress",
            ImportProgress {
                file_index: index,
                total_files: total,
                filename: filename.clone(),
                status: "saving".to_string(),
                error: None,
                activity: None,
            },
        );

        // Save to database
        let conn = state.db.lock().unwrap();
        let result = insert_activity(&conn, &parsed);
        drop(conn); // Release lock

        match result {
            Ok(id) => {
                let activity = Activity {
                    id,
                    filename: parsed.filename.clone(),
                    activity_type: parsed.activity_type.clone(),
                    activity_date: parsed.activity_date.to_string(),
                    start_time: parsed.start_time.clone(),
                    location: parsed.location.clone(),
                    total_duration: parsed.total_duration,
                    zones: parsed.zones.clone(),
                    elevation_gain: Some(parsed.elevation_gain),
                    max_altitude: parsed.max_altitude,
                    min_altitude: parsed.min_altitude,
                    total_distance: Some(parsed.total_distance),
                };

                let _ = app.emit(
                    "import-progress",
                    ImportProgress {
                        file_index: index,
                        total_files: total,
                        filename: filename.clone(),
                        status: "done".to_string(),
                        error: None,
                        activity: Some(activity.clone()),
                    },
                );

                results.push(activity);
            }
            Err(e) => {
                let _ = app.emit(
                    "import-progress",
                    ImportProgress {
                        file_index: index,
                        total_files: total,
                        filename: filename.clone(),
                        status: "error".to_string(),
                        error: Some(e.to_string()),
                        activity: None,
                    },
                );
            }
        }
    }

    Ok(results)
}

// ============ Tile Server Commands ============

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TileMetadata {
    name: String,
    value: String,
}

#[tauri::command]
fn list_tile_files(state: State<AppState>) -> Vec<String> {
    let tiles = state.tiles.lock().unwrap();
    tiles.list_available()
}

#[tauri::command]
fn load_tiles(name: String, state: State<AppState>) -> Result<Vec<TileMetadata>, AppError> {
    let mut tiles = state.tiles.lock().unwrap();
    tiles.load_mbtiles(&name)?;

    let metadata = tiles.get_metadata()?;
    Ok(metadata
        .into_iter()
        .map(|(name, value)| TileMetadata { name, value })
        .collect())
}

#[tauri::command]
fn get_tile(z: u32, x: u32, y: u32, state: State<AppState>) -> Result<Option<Vec<u8>>, AppError> {
    let tiles = state.tiles.lock().unwrap();
    tiles.get_tile(z, x, y)
}

#[tauri::command]
fn get_tiles_path(state: State<AppState>) -> String {
    let tiles = state.tiles.lock().unwrap();
    tiles.get_tiles_path().to_string_lossy().to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            let db_path = app_dir.join("fitness.db");
            let conn = init_db(&db_path).expect("Failed to initialize database");
            let tile_server = TileServer::new(app_dir);
            app.manage(AppState {
                db: Mutex::new(conn),
                tiles: Mutex::new(tile_server),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            import_fit_file,
            import_fit_files,
            list_activities,
            get_activity,
            get_weekly_summary,
            get_monthly_summary,
            delete_activity,
            list_tile_files,
            load_tiles,
            get_tile,
            get_tiles_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
