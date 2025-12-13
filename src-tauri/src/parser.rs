use crate::error::AppError;
use crate::types::ZoneTimes;
use crate::zones::get_zone;
use chrono::{DateTime, Datelike, NaiveDate, Utc};
use fitparser::{from_reader, profile::MesgNum, FitDataRecord, Value};
use reverse_geocoder::ReverseGeocoder;
use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

/// Core field names we extract to dedicated columns
const CORE_FIELDS: &[&str] = &[
    "timestamp",
    "heart_rate",
    "distance",
    "altitude",
    "enhanced_altitude",
    "speed",
    "enhanced_speed",
    "temperature",
    "position_lat",
    "position_long",
];

/// Parsed record from FIT file with all available data
#[derive(Debug, Clone)]
pub struct ParsedRecord {
    pub timestamp: DateTime<Utc>,
    pub elapsed_time: f64,
    pub heart_rate: Option<u8>,
    pub distance: Option<f64>,
    pub altitude: Option<f64>,
    pub speed: Option<f64>,
    pub temperature: Option<i8>,
    pub position_lat: Option<f64>,
    pub position_long: Option<f64>,
    pub zone: String,
    pub extras: HashMap<String, f64>,
}

/// Parsed activity from FIT file
#[derive(Debug, Clone)]
pub struct ParsedActivity {
    pub filename: String,
    pub activity_type: String,
    pub activity_date: NaiveDate,
    pub start_time: String,
    pub location: Option<String>,
    pub week_start: NaiveDate,
    pub month_start: NaiveDate,
    pub total_duration: f64,
    pub total_distance: f64,
    pub zones: ZoneTimes,
    pub records: Vec<ParsedRecord>,
    pub elevation_gain: f64,
    pub max_altitude: Option<f64>,
    pub min_altitude: Option<f64>,
}

/// Get Monday of the week containing the given date
fn week_start(date: NaiveDate) -> NaiveDate {
    let days_from_monday = date.weekday().num_days_from_monday();
    date - chrono::Duration::days(days_from_monday as i64)
}

/// Get first day of the month containing the given date
fn month_start(date: NaiveDate) -> NaiveDate {
    NaiveDate::from_ymd_opt(date.year(), date.month(), 1).unwrap_or(date)
}

/// Convert FIT semicircles to degrees
fn semicircles_to_degrees(semicircles: i32) -> f64 {
    (semicircles as f64) * (180.0 / 2_147_483_648.0)
}

/// Extract a numeric value from a FIT field
fn extract_f64(value: &Value) -> Option<f64> {
    match value {
        Value::SInt8(v) => Some(*v as f64),
        Value::UInt8(v) => Some(*v as f64),
        Value::SInt16(v) => Some(*v as f64),
        Value::UInt16(v) => Some(*v as f64),
        Value::SInt32(v) => Some(*v as f64),
        Value::UInt32(v) => Some(*v as f64),
        Value::SInt64(v) => Some(*v as f64),
        Value::UInt64(v) => Some(*v as f64),
        Value::Float32(v) => Some(*v as f64),
        Value::Float64(v) => Some(*v),
        _ => None,
    }
}

fn map_sport_code_to_type(code: u16) -> Option<&'static str> {
    match code {
        1 => Some("Run"),
        5 => Some("Swimming"),
        11 => Some("Walk"),
        17 => Some("Hike"),
        // Common "training" / strength-like codes sometimes appear as 7/8/9 depending on device.
        7 | 8 | 9 => Some("Strength"),
        _ => None,
    }
}

fn map_sport_string_to_type(raw: &str) -> Option<&'static str> {
    let s = raw.to_ascii_lowercase();
    if s.contains("hike") || s.contains("hiking") {
        Some("Hike")
    } else if s.contains("walk") || s.contains("walking") {
        Some("Walk")
    } else if s.contains("swim") || s.contains("swimming") {
        Some("Swimming")
    } else if s.contains("run") || s.contains("running") {
        Some("Run")
    } else if s.contains("strength") || s.contains("training") {
        Some("Strength")
    } else {
        None
    }
}

fn extract_activity_type(records: &[FitDataRecord]) -> String {
    for record in records {
        if record.kind() != MesgNum::Session && record.kind() != MesgNum::Activity {
            continue;
        }

        let mut sport_str: Option<String> = None;
        let mut sport_code: Option<u16> = None;

        for field in record.fields() {
            let name = field.name();
            let value = field.value();

            if name == "sport" || name == "sub_sport" {
                match value {
                    Value::Enum(v) => sport_code = Some(*v as u16),
                    Value::UInt8(v) => sport_code = Some(*v as u16),
                    Value::UInt16(v) => sport_code = Some(*v),
                    Value::String(s) => sport_str = Some(s.clone()),
                    _ => {}
                }
            }
        }

        if let Some(raw) = sport_str {
            if let Some(mapped) = map_sport_string_to_type(&raw) {
                return mapped.to_string();
            }
        }
        if let Some(code) = sport_code {
            if let Some(mapped) = map_sport_code_to_type(code) {
                return mapped.to_string();
            }
        }
    }

    "Other".to_string()
}

/// Parse a FIT file and extract all available record data
pub fn parse_fit_file(path: &Path) -> Result<ParsedActivity, AppError> {
    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let file = File::open(path)
        .map_err(|e| AppError::FitParse(format!("Failed to open file: {}", e)))?;
    let mut reader = BufReader::new(file);

    let fit_records = from_reader(&mut reader)
        .map_err(|e| AppError::FitParse(format!("FIT parse error: {}", e)))?;

    let activity_type = extract_activity_type(&fit_records);

    // Collect all record data
    let mut raw_records: Vec<(DateTime<Utc>, Option<u8>, Option<f64>, Option<f64>, Option<f64>, Option<i8>, Option<i32>, Option<i32>, HashMap<String, f64>)> = Vec::new();

    for record in fit_records {
        if record.kind() != MesgNum::Record {
            continue;
        }

        let mut timestamp: Option<DateTime<Utc>> = None;
        let mut heart_rate: Option<u8> = None;
        let mut distance: Option<f64> = None;
        let mut altitude: Option<f64> = None;
        let mut enhanced_altitude: Option<f64> = None;
        let mut speed: Option<f64> = None;
        let mut enhanced_speed: Option<f64> = None;
        let mut temperature: Option<i8> = None;
        let mut position_lat: Option<i32> = None;
        let mut position_long: Option<i32> = None;
        let mut extras: HashMap<String, f64> = HashMap::new();

        for field in record.fields() {
            let name = field.name();
            let value = field.value();

            match name {
                "timestamp" => {
                    if let Value::Timestamp(ts) = value {
                        timestamp = Some(ts.with_timezone(&Utc));
                    }
                }
                "heart_rate" => {
                    if let Value::UInt8(hr) = value {
                        heart_rate = Some(*hr);
                    }
                }
                "distance" => {
                    distance = extract_f64(value);
                }
                "altitude" => {
                    altitude = extract_f64(value);
                }
                "enhanced_altitude" => {
                    enhanced_altitude = extract_f64(value);
                }
                "speed" => {
                    speed = extract_f64(value);
                }
                "enhanced_speed" => {
                    enhanced_speed = extract_f64(value);
                }
                "temperature" => {
                    if let Value::SInt8(t) = value {
                        temperature = Some(*t);
                    }
                }
                "position_lat" => {
                    if let Value::SInt32(lat) = value {
                        position_lat = Some(*lat);
                    }
                }
                "position_long" => {
                    if let Value::SInt32(lon) = value {
                        position_long = Some(*lon);
                    }
                }
                _ => {
                    // Capture any other numeric field as extra
                    if !CORE_FIELDS.contains(&name) {
                        if let Some(v) = extract_f64(value) {
                            extras.insert(name.to_string(), v);
                        }
                    }
                }
            }
        }

        // Skip records without timestamp
        if let Some(ts) = timestamp {
            // Prefer enhanced values
            let final_altitude = enhanced_altitude.or(altitude);
            let final_speed = enhanced_speed.or(speed);

            raw_records.push((
                ts,
                heart_rate,
                distance,
                final_altitude,
                final_speed,
                temperature,
                position_lat,
                position_long,
                extras,
            ));
        }
    }

    if raw_records.is_empty() {
        return Err(AppError::FitParse("No records found".to_string()));
    }

    // Sort by timestamp
    raw_records.sort_by_key(|(ts, ..)| *ts);

    let first_timestamp = raw_records[0].0;
    let mut parsed_records: Vec<ParsedRecord> = Vec::new();
    let mut zones = ZoneTimes::default();
    let mut total_duration = 0.0;
    let mut elevation_gain = 0.0;
    let mut max_altitude: Option<f64> = None;
    let mut min_altitude: Option<f64> = None;
    let mut last_altitude: Option<f64> = None;

    for i in 0..raw_records.len() {
        let (timestamp, heart_rate, distance, altitude, speed, temperature, position_lat, position_long, extras) = raw_records[i].clone();

        let elapsed_time = (timestamp - first_timestamp).num_milliseconds() as f64 / 1000.0;
        let zone = heart_rate
            .map(|hr| get_zone(hr).to_string())
            .unwrap_or_else(|| "zone1".to_string());

        // Calculate time delta for zone accumulation
        let time_delta = if i + 1 < raw_records.len() {
            let next_ts = raw_records[i + 1].0;
            let delta = (next_ts - timestamp).num_milliseconds() as f64 / 1000.0;
            delta.min(10.0).max(0.0)
        } else {
            0.0
        };

        // Accumulate zone times
        if heart_rate.is_some() {
            match zone.as_str() {
                "zone1" => zones.zone1 += time_delta,
                "zone2" => zones.zone2 += time_delta,
                "zone3" => zones.zone3 += time_delta,
                "zone4" => zones.zone4 += time_delta,
                "zone5" => zones.zone5 += time_delta,
                _ => {}
            }
        }
        total_duration += time_delta;

        // Calculate elevation stats
        if let Some(alt) = altitude {
            // Min/Max
            min_altitude = Some(min_altitude.map_or(alt, |m| m.min(alt)));
            max_altitude = Some(max_altitude.map_or(alt, |m| m.max(alt)));

            // Gain
            if let Some(last) = last_altitude {
                if alt > last {
                    elevation_gain += alt - last;
                }
            }
            last_altitude = Some(alt);
        }

        parsed_records.push(ParsedRecord {
            timestamp,
            elapsed_time,
            heart_rate,
            distance,
            altitude,
            speed,
            temperature,
            position_lat: position_lat.map(semicircles_to_degrees),
            position_long: position_long.map(semicircles_to_degrees),
            zone,
            extras,
        });
    }

    let activity_date = parsed_records[0].timestamp.date_naive();
    let start_time = parsed_records[0].timestamp.to_rfc3339();
    // Get max distance from records or 0.0
    let total_distance = parsed_records
        .iter()
        .filter_map(|r| r.distance)
        .fold(0.0, f64::max);

    // Reverse Geocode
    let location = parsed_records
        .iter()
        .find(|r| r.position_lat.is_some() && r.position_long.is_some())
        .and_then(|r| {
            let lat = r.position_lat?;
            let lon = r.position_long?;
            let geocoder = ReverseGeocoder::new();
            let search_result = geocoder.search((lat, lon));
            Some(format!("{}, {}", search_result.record.name, search_result.record.cc))
        });

    Ok(ParsedActivity {
        filename,
        activity_type,
        activity_date,
        start_time,
        location,
        week_start: week_start(activity_date),
        month_start: month_start(activity_date),
        total_duration,
        total_distance,
        zones,
        records: parsed_records,
        elevation_gain,
        max_altitude,
        min_altitude,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_week_start_monday() {
        let date = NaiveDate::from_ymd_opt(2025, 12, 1).unwrap();
        assert_eq!(week_start(date), date);
    }

    #[test]
    fn test_week_start_sunday() {
        let date = NaiveDate::from_ymd_opt(2025, 12, 7).unwrap();
        let expected = NaiveDate::from_ymd_opt(2025, 12, 1).unwrap();
        assert_eq!(week_start(date), expected);
    }

    #[test]
    fn test_month_start() {
        let date = NaiveDate::from_ymd_opt(2025, 12, 15).unwrap();
        let expected = NaiveDate::from_ymd_opt(2025, 12, 1).unwrap();
        assert_eq!(month_start(date), expected);
    }

    #[test]
    fn test_semicircles_to_degrees() {
        // 0 semicircles = 0 degrees
        assert!((semicircles_to_degrees(0) - 0.0).abs() < 0.0001);
        // Max positive = 180 degrees
        assert!((semicircles_to_degrees(2_147_483_647) - 180.0).abs() < 0.001);
    }
}
