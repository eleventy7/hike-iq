use crate::error::AppError;
use crate::parser::ParsedActivity;
use crate::types::{Activity, ActivityDetail, TrackRecord, ZoneSummary, ZoneTimes};
use rusqlite::{params, Connection};
use std::collections::HashMap;

/// Insert a parsed activity into the database
pub fn insert_activity(conn: &Connection, activity: &ParsedActivity) -> Result<i64, AppError> {
    // Check for duplicate
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM activities WHERE filename = ?)",
        [&activity.filename],
        |row| row.get(0),
    )?;

    if exists {
        return Err(AppError::DuplicateActivity(activity.filename.clone()));
    }

    // Insert activity
    conn.execute(
        r#"INSERT INTO activities (filename, activity_type, activity_date, start_time, location, week_start, month_start, total_duration, total_distance, total_records, elevation_gain, max_altitude, min_altitude)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        params![
            activity.filename,
            activity.activity_type,
            activity.activity_date.to_string(),
            activity.start_time,
            activity.location,
            activity.week_start.to_string(),
            activity.month_start.to_string(),
            activity.total_duration,
            activity.total_distance,
            activity.records.len() as i64,
            activity.elevation_gain,
            activity.max_altitude,
            activity.min_altitude,
        ],
    )?;

    let activity_id = conn.last_insert_rowid();

    // Insert zone times
    conn.execute(
        r#"INSERT INTO activity_zones (activity_id, zone1_seconds, zone2_seconds, zone3_seconds, zone4_seconds, zone5_seconds)
           VALUES (?, ?, ?, ?, ?, ?)"#,
        params![
            activity_id,
            activity.zones.zone1,
            activity.zones.zone2,
            activity.zones.zone3,
            activity.zones.zone4,
            activity.zones.zone5,
        ],
    )?;

    // Insert records with extended fields
    let mut stmt = conn.prepare(
        r#"INSERT INTO records (activity_id, timestamp, elapsed_time, heart_rate, distance, altitude, speed, temperature, position_lat, position_long, zone, extras)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )?;

    for record in &activity.records {
        let extras_json = serde_json::to_string(&record.extras).unwrap_or_else(|_| "{}".to_string());

        stmt.execute(params![
            activity_id,
            record.timestamp.to_rfc3339(),
            record.elapsed_time,
            record.heart_rate.map(|hr| hr as i32),
            record.distance,
            record.altitude,
            record.speed,
            record.temperature.map(|t| t as f64),
            record.position_lat,
            record.position_long,
            record.zone,
            extras_json,
        ])?;
    }

    Ok(activity_id)
}

/// List all activities
pub fn list_activities(conn: &Connection) -> Result<Vec<Activity>, AppError> {
    let mut stmt = conn.prepare(
        r#"SELECT a.id, a.filename, a.activity_type, a.activity_date, a.total_duration,
                  z.zone1_seconds, z.zone2_seconds, z.zone3_seconds, z.zone4_seconds, z.zone5_seconds,
                  a.elevation_gain, a.max_altitude, a.min_altitude, a.start_time, a.total_distance, a.location
           FROM activities a
           JOIN activity_zones z ON z.activity_id = a.id
           ORDER BY a.start_time DESC"#,
    )?;

    let activities = stmt
        .query_map([], |row| {
            Ok(Activity {
                id: row.get(0)?,
                filename: row.get(1)?,
                activity_type: row.get(2)?,
                activity_date: row.get(3)?,
                total_duration: row.get(4)?,
                zones: ZoneTimes {
                    zone1: row.get(5)?,
                    zone2: row.get(6)?,
                    zone3: row.get(7)?,
                    zone4: row.get(8)?,
                    zone5: row.get(9)?,
                },
                elevation_gain: row.get(10)?,
                max_altitude: row.get(11)?,
                min_altitude: row.get(12)?,
                start_time: row.get(13)?,
                total_distance: row.get(14)?,
                location: row.get(15)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(activities)
}

/// Get activity detail with track records
pub fn get_activity(conn: &Connection, id: i64) -> Result<ActivityDetail, AppError> {
    let activity = conn
        .query_row(
            r#"SELECT a.id, a.filename, a.activity_type, a.activity_date, a.total_duration,
                      z.zone1_seconds, z.zone2_seconds, z.zone3_seconds, z.zone4_seconds, z.zone5_seconds,
                      a.elevation_gain, a.max_altitude, a.min_altitude, a.start_time, a.total_distance, a.location
               FROM activities a
               JOIN activity_zones z ON z.activity_id = a.id
               WHERE a.id = ?"#,
            [id],
            |row| {
                Ok(Activity {
                    id: row.get(0)?,
                    filename: row.get(1)?,
                    activity_type: row.get(2)?,
                    activity_date: row.get(3)?,
                    total_duration: row.get(4)?,
                    zones: ZoneTimes {
                        zone1: row.get(5)?,
                        zone2: row.get(6)?,
                        zone3: row.get(7)?,
                        zone4: row.get(8)?,
                        zone5: row.get(9)?,
                    },
                    elevation_gain: row.get(10)?,
                    max_altitude: row.get(11)?,
                    min_altitude: row.get(12)?,
                    start_time: row.get(13)?,
                    total_distance: row.get(14)?,
                    location: row.get(15)?,
                })
            },
        )
        .map_err(|_| AppError::ActivityNotFound(id))?;

    let mut stmt = conn.prepare(
        r#"SELECT timestamp, elapsed_time, heart_rate, distance, altitude, speed, temperature, position_lat, position_long, zone, extras
           FROM records
           WHERE activity_id = ?
           ORDER BY timestamp"#,
    )?;

    let records = stmt
        .query_map([id], |row| {
            let extras_json: String = row.get(10)?;
            let extras: HashMap<String, f64> = serde_json::from_str(&extras_json).unwrap_or_default();

            Ok(TrackRecord {
                timestamp: row.get(0)?,
                elapsed_time: row.get(1)?,
                heart_rate: row.get(2)?,
                distance: row.get(3)?,
                altitude: row.get(4)?,
                speed: row.get(5)?,
                temperature: row.get(6)?,
                position_lat: row.get(7)?,
                position_long: row.get(8)?,
                zone: row.get(9)?,
                extras,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ActivityDetail {
        id: activity.id,
        filename: activity.filename,
        activity_type: activity.activity_type,
        activity_date: activity.activity_date,
        start_time: activity.start_time,
        location: activity.location,
        total_duration: activity.total_duration,
        zones: activity.zones,
        elevation_gain: activity.elevation_gain,
        max_altitude: activity.max_altitude,
        min_altitude: activity.min_altitude,
        total_distance: activity.total_distance,
        records,
    })
}

/// Get weekly summary
pub fn get_weekly_summary(conn: &Connection, week_start: &str) -> Result<ZoneSummary, AppError> {
    let result = conn.query_row(
        r#"SELECT COUNT(*),
                  COALESCE(SUM(z.zone1_seconds), 0),
                  COALESCE(SUM(z.zone2_seconds), 0),
                  COALESCE(SUM(z.zone3_seconds), 0),
                  COALESCE(SUM(z.zone4_seconds), 0),
                  COALESCE(SUM(z.zone5_seconds), 0)
           FROM activities a
           JOIN activity_zones z ON z.activity_id = a.id
           WHERE a.week_start = ?"#,
        [week_start],
        |row| {
            Ok(ZoneSummary {
                period_start: week_start.to_string(),
                activity_count: row.get(0)?,
                zones: ZoneTimes {
                    zone1: row.get(1)?,
                    zone2: row.get(2)?,
                    zone3: row.get(3)?,
                    zone4: row.get(4)?,
                    zone5: row.get(5)?,
                },
            })
        },
    )?;

    Ok(result)
}

/// Get monthly summary
pub fn get_monthly_summary(conn: &Connection, month_start: &str) -> Result<ZoneSummary, AppError> {
    let result = conn.query_row(
        r#"SELECT COUNT(*),
                  COALESCE(SUM(z.zone1_seconds), 0),
                  COALESCE(SUM(z.zone2_seconds), 0),
                  COALESCE(SUM(z.zone3_seconds), 0),
                  COALESCE(SUM(z.zone4_seconds), 0),
                  COALESCE(SUM(z.zone5_seconds), 0)
           FROM activities a
           JOIN activity_zones z ON z.activity_id = a.id
           WHERE a.month_start = ?"#,
        [month_start],
        |row| {
            Ok(ZoneSummary {
                period_start: month_start.to_string(),
                activity_count: row.get(0)?,
                zones: ZoneTimes {
                    zone1: row.get(1)?,
                    zone2: row.get(2)?,
                    zone3: row.get(3)?,
                    zone4: row.get(4)?,
                    zone5: row.get(5)?,
                },
            })
        },
    )?;

    Ok(result)
}

/// Delete an activity and all its related records
pub fn delete_activity(conn: &Connection, id: i64) -> Result<(), AppError> {
    // Check if activity exists
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM activities WHERE id = ?)",
        [id],
        |row| row.get(0),
    )?;

    if !exists {
        return Err(AppError::ActivityNotFound(id));
    }

    // Delete in order: records -> activity_zones -> activities (due to foreign keys)
    conn.execute("DELETE FROM records WHERE activity_id = ?", [id])?;
    conn.execute("DELETE FROM activity_zones WHERE activity_id = ?", [id])?;
    conn.execute("DELETE FROM activities WHERE id = ?", [id])?;

    Ok(())
}
