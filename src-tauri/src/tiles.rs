use rusqlite::{Connection, OptionalExtension};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::error::AppError;

/// MBTiles tile server state
pub struct TileServer {
    conn: Option<Mutex<Connection>>,
    tiles_path: PathBuf,
}

impl TileServer {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let tiles_path = app_data_dir.join("tiles");
        std::fs::create_dir_all(&tiles_path).ok();

        Self {
            conn: None,
            tiles_path,
        }
    }

    /// Load an MBTiles file
    pub fn load_mbtiles(&mut self, name: &str) -> Result<(), AppError> {
        let mbtiles_path = self.tiles_path.join(format!("{}.mbtiles", name));

        if !mbtiles_path.exists() {
            return Err(AppError::NotFound(format!(
                "MBTiles file not found: {}",
                mbtiles_path.display()
            )));
        }

        let conn = Connection::open(&mbtiles_path)?;
        self.conn = Some(Mutex::new(conn));
        Ok(())
    }

    /// Get a tile from the loaded MBTiles
    pub fn get_tile(&self, z: u32, x: u32, y: u32) -> Result<Option<Vec<u8>>, AppError> {
        let conn = self.conn.as_ref().ok_or_else(|| {
            AppError::NotFound("No MBTiles file loaded".to_string())
        })?;

        let conn = conn.lock().unwrap();

        // MBTiles uses TMS (flipped Y coordinate)
        let tms_y = (1 << z) - 1 - y;

        let tile: Option<Vec<u8>> = conn
            .query_row(
                "SELECT tile_data FROM tiles WHERE zoom_level = ?1 AND tile_column = ?2 AND tile_row = ?3",
                [z, x, tms_y],
                |row| row.get(0),
            )
            .optional()?;

        Ok(tile)
    }

    /// Get metadata from the MBTiles file
    pub fn get_metadata(&self) -> Result<Vec<(String, String)>, AppError> {
        let conn = self.conn.as_ref().ok_or_else(|| {
            AppError::NotFound("No MBTiles file loaded".to_string())
        })?;

        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare("SELECT name, value FROM metadata")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        let mut metadata = Vec::new();
        for row in rows {
            metadata.push(row?);
        }

        Ok(metadata)
    }

    /// List available MBTiles files
    pub fn list_available(&self) -> Vec<String> {
        let mut files = Vec::new();

        if let Ok(entries) = std::fs::read_dir(&self.tiles_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(filename) = path.file_name() {
                    let name = filename.to_string_lossy();
                    if name.ends_with(".mbtiles") {
                        // Remove .mbtiles extension
                        files.push(name.trim_end_matches(".mbtiles").to_string());
                    }
                }
            }
        }

        files
    }

    /// Get the tiles directory path
    pub fn get_tiles_path(&self) -> PathBuf {
        self.tiles_path.clone()
    }
}
