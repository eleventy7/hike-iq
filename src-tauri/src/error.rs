use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("FIT parsing error: {0}")]
    FitParse(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Activity not found: {0}")]
    ActivityNotFound(i64),

    #[error("Duplicate activity: {0}")]
    DuplicateActivity(String),

    #[error("Not found: {0}")]
    NotFound(String),
}

// Implement serialization for Tauri commands
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
