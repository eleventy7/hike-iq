use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Zone time breakdown in seconds
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoneTimes {
    pub zone1: f64,
    pub zone2: f64,
    pub zone3: f64,
    pub zone4: f64,
    pub zone5: f64,
}

/// Activity summary for list view
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub id: i64,
    pub filename: String,
    pub activity_type: String,
    pub activity_date: String,
    pub start_time: String,
    pub location: Option<String>,
    pub total_duration: f64,
    pub total_distance: Option<f64>,
    pub zones: ZoneTimes,
    pub elevation_gain: Option<f64>,
    pub max_altitude: Option<f64>,
    pub min_altitude: Option<f64>,
}

/// Extended track record with all available data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackRecord {
    pub timestamp: String,
    pub elapsed_time: f64,
    pub heart_rate: Option<i32>,
    pub distance: Option<f64>,
    pub altitude: Option<f64>,
    pub speed: Option<f64>,
    pub temperature: Option<f64>,
    pub position_lat: Option<f64>,
    pub position_long: Option<f64>,
    pub zone: String,
    pub extras: HashMap<String, f64>,
}

/// Full activity detail with track records
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityDetail {
    pub id: i64,
    pub filename: String,
    pub activity_type: String,
    pub activity_date: String,
    pub start_time: String,
    pub location: Option<String>,
    pub total_duration: f64,
    pub total_distance: Option<f64>,
    pub zones: ZoneTimes,
    pub elevation_gain: Option<f64>,
    pub max_altitude: Option<f64>,
    pub min_altitude: Option<f64>,
    pub records: Vec<TrackRecord>,
}

/// Weekly/monthly aggregation summary
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoneSummary {
    pub period_start: String,
    pub activity_count: i32,
    pub zones: ZoneTimes,
}
