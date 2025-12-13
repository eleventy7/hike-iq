export interface ZoneTimes {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

export interface Activity {
  id: number;
  filename: string;
  activityType: ActivityType;
  activityDate: string;
  startTime: string;
  location?: string;
  totalDuration: number;
  totalDistance?: number;
  zones: ZoneTimes;
  elevationGain?: number;
  maxAltitude?: number;
  minAltitude?: number;
}

export type Zone = 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5';

export interface TrackRecord {
  timestamp: string;
  elapsedTime: number;
  heartRate: number | null;
  distance: number | null;
  altitude: number | null;
  speed: number | null;
  temperature: number | null;
  positionLat: number | null;
  positionLong: number | null;
  zone: Zone;
  extras: Record<string, number>;
}

export interface ActivityDetail extends Activity {
  records: TrackRecord[];
}

export type ActivityType = "Hike" | "Walk" | "Swimming" | "Run" | "Strength" | "Other";

export interface ZoneSummary {
  periodStart: string;
  activityCount: number;
  zones: ZoneTimes;
}
