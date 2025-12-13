use rusqlite::{Connection, Result};
use std::path::Path;

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS activities (
    id              INTEGER PRIMARY KEY,
    filename        TEXT NOT NULL UNIQUE,
    activity_type   TEXT NOT NULL DEFAULT 'Other',
    activity_date   TEXT NOT NULL,
    start_time      TEXT NOT NULL,
    location        TEXT,
    week_start      TEXT NOT NULL,
    month_start     TEXT NOT NULL,
    total_duration  REAL NOT NULL,
    total_distance  REAL,
    total_records   INTEGER NOT NULL,
    elevation_gain  REAL,
    max_altitude    REAL,
    min_altitude    REAL,
    imported_at     TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_zones (
    activity_id     INTEGER PRIMARY KEY REFERENCES activities(id),
    zone1_seconds   REAL DEFAULT 0,
    zone2_seconds   REAL DEFAULT 0,
    zone3_seconds   REAL DEFAULT 0,
    zone4_seconds   REAL DEFAULT 0,
    zone5_seconds   REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS records (
    id              INTEGER PRIMARY KEY,
    activity_id     INTEGER REFERENCES activities(id),
    timestamp       TEXT NOT NULL,
    elapsed_time    REAL,
    heart_rate      INTEGER,
    distance        REAL,
    altitude        REAL,
    speed           REAL,
    temperature     REAL,
    position_lat    REAL,
    position_long   REAL,
    zone            TEXT,
    extras          TEXT
);

CREATE INDEX IF NOT EXISTS idx_activities_week ON activities(week_start);
CREATE INDEX IF NOT EXISTS idx_activities_month ON activities(month_start);
CREATE INDEX IF NOT EXISTS idx_records_activity ON records(activity_id);
"#;

/// Initialize database connection and create schema
pub fn init_db(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    conn.execute_batch(SCHEMA)?;
    migrate_db(&conn)?;
    Ok(conn)
}

fn migrate_db(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(activities)")?;
    let cols: Vec<String> = stmt
        .query_map([], |row| row.get(1))?
        .collect::<Result<Vec<_>, _>>()?;

    if !cols.iter().any(|c| c == "activity_type") {
        conn.execute(
            "ALTER TABLE activities ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'Other'",
            [],
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_init_db_creates_tables() {
        let temp_dir = std::env::temp_dir();
        let db_path = temp_dir.join("test_fitness.db");

        // Clean up from previous runs
        let _ = fs::remove_file(&db_path);

        let conn = init_db(&db_path).expect("Failed to init db");

        // Verify tables exist
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"activities".to_string()));
        assert!(tables.contains(&"activity_zones".to_string()));
        assert!(tables.contains(&"records".to_string()));

        // Verify indexes exist
        let indexes: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(indexes.contains(&"idx_activities_week".to_string()));
        assert!(indexes.contains(&"idx_activities_month".to_string()));
        assert!(indexes.contains(&"idx_records_activity".to_string()));

        // Clean up
        let _ = fs::remove_file(&db_path);
    }
}
