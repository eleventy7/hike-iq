import { useEffect, useState } from "react";
import { ZoneBreakdownCard } from "@/components/ZoneBreakdownCard";
import { HrTimelineChart } from "@/components/HrTimelineChart";
import { HeartRateZoneChartV2 } from "@/components/HeartRateZoneChartV2";
import { HeartRateAnalysisTable } from "@/components/HeartRateAnalysisTable";
import { HeartRateRecoveryTable } from "@/components/HeartRateRecoveryTable";
import { PaceHeartRateChart } from "@/components/PaceHeartRateChart";
import { ElevationAnalysisChart } from "@/components/ElevationAnalysisChart";
import { MapView } from "@/components/MapView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Activity, ActivityDetail } from "@/lib/types";
import { formatDuration, ZONE_CONFIG, ZONE_KEYS } from "@/lib/zones";
import { Calendar, MapPin, Activity as ActivityIcon, TrendingUp, Heart, Gauge, Route, Clock, Zap, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnits } from "@/lib/units";

interface ActivityDetailViewProps {
  activity: Activity;
}

export function ActivityDetailView({ activity }: ActivityDetailViewProps) {
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatDistance, formatElevation, formatSpeed, distanceUnit, elevationUnit, speedUnit, units } = useUnits();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getActivity(activity.id);
        setDetail(data);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activity.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 bg-muted rounded-xl animate-pulse" style={{ animationDelay: '0.1s' }} />
          <div className="h-64 bg-muted rounded-xl animate-pulse" style={{ animationDelay: '0.2s' }} />
        </div>
        <div className="h-96 bg-muted rounded-xl animate-pulse" style={{ animationDelay: '0.3s' }} />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-destructive/10 flex items-center justify-center">
            <ActivityIcon className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium">Failed to load activity</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Check if we have altitude data for the zone chart
  const hasAltitudeData = detail.records.some((r) => r.altitude !== null);
  // Check if we have GPS data for the map
  const hasGpsData = detail.records.some((r) => r.positionLat !== null && r.positionLong !== null);
  // Check for HR and Speed data for Pace/HR chart
  const hasPaceHrData = detail.records.some((r) => r.heartRate !== null && r.speed !== null);

  // Find dominant zone
  const dominantZone = ZONE_KEYS.reduce((max, key) =>
    detail.zones[key] > detail.zones[max] ? key : max
  , ZONE_KEYS[0]);
  const dominantColor = ZONE_CONFIG[dominantZone].color;

  // Format date nicely
  const date = new Date(detail.startTime);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  // Calculate stats from records
  const distances = detail.records.filter(r => r.distance !== null).map(r => r.distance!);
  const totalDistance = distances.length > 0 ? Math.max(...distances) / 1000 : 0; // km

  const altitudes = detail.records.filter(r => r.altitude !== null).map(r => r.altitude!);
  const elevationGain = altitudes.length > 1
    ? altitudes.reduce((gain, alt, i) => {
        if (i === 0) return 0;
        const diff = alt - altitudes[i - 1];
        return gain + (diff > 0 ? diff : 0);
      }, 0)
    : 0;
  const minAltitude = altitudes.length > 0 ? Math.min(...altitudes) : null;
  const maxAltitude = altitudes.length > 0 ? Math.max(...altitudes) : null;

  const heartRates = detail.records.filter(r => r.heartRate !== null).map(r => r.heartRate!);
  const avgHR = heartRates.length > 0
    ? Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length)
    : null;
  const maxHR = heartRates.length > 0 ? Math.max(...heartRates) : null;

  // Pace & Speed
  const distanceInKm = totalDistance;
  const distanceForPace = units === "imperial" ? distanceInKm * 0.621371 : distanceInKm; // miles or km
  const avgPace = distanceForPace > 0 ? (detail.totalDuration / 60) / distanceForPace : 0; // min/unit
  const formatPace = (pace: number) => {
    if (pace === 0 || !isFinite(pace)) return "—";
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /${distanceUnit}`;
  };

  const speeds = detail.records.filter(r => r.speed !== null).map(r => r.speed!);
  const maxSpeedKmh = speeds.length > 0 ? Math.max(...speeds) * 3.6 : 0; // m/s to km/h

  // Stats config for mini cards
  const stats = [
    {
      label: "Distance",
      value: `${formatDistance(totalDistance)} ${distanceUnit}`,
      icon: Route,
      color: "#208581",
      show: totalDistance > 0
    },
    {
      label: "Avg Pace",
      value: formatPace(avgPace),
      icon: Clock,
      color: "#F3D16E",
      show: totalDistance > 0
    },
    {
      label: "Elevation Gain",
      value: `${formatElevation(elevationGain)} ${elevationUnit}`,
      icon: TrendingUp,
      color: "#374D81",
      show: elevationGain > 0
    },
    {
      label: "Min Altitude",
      value: minAltitude ? `${formatElevation(minAltitude)} ${elevationUnit}` : "—",
      icon: ArrowDown,
      color: "#208581",
      show: minAltitude !== null
    },
    {
      label: "Max Altitude",
      value: maxAltitude ? `${formatElevation(maxAltitude)} ${elevationUnit}` : "—",
      icon: ArrowUp,
      color: "#208581",
      show: maxAltitude !== null
    },
    {
      label: "Avg HR",
      value: avgHR ? `${avgHR} bpm` : "—",
      icon: Heart,
      color: "#EA4B60",
      show: avgHR !== null
    },
    {
      label: "Max HR",
      value: maxHR ? `${maxHR} bpm` : "—",
      icon: Gauge,
      color: "#C3012F",
      show: maxHR !== null
    },
    {
      label: "Max Speed",
      value: `${formatSpeed(maxSpeedKmh)} ${speedUnit}`,
      icon: Zap,
      color: "#F3D16E",
      show: maxSpeedKmh > 0
    },
  ].filter(s => s.show);

  return (
    <div className="space-y-6">
      {/* Hero Header Card */}
      <Card className="card-elevated animate-fade-in overflow-hidden relative">
        {/* Accent bar */}
        <div
          className="absolute top-0 left-0 w-full h-1.5"
          style={{ background: `linear-gradient(90deg, ${dominantColor}, ${dominantColor}66)` }}
        />

        <CardContent className="pt-6 pb-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: Icon + Date */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${dominantColor}15` }}
              >
                <ActivityIcon className="w-7 h-7" style={{ color: dominantColor }} />
              </div>
              <div>
                <h2 className="metric-medium">
                  {activity.location || activity.filename.replace('.fit', '').replace('.FIT', '')}
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Right: Duration Hero */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Duration</div>
                <div className="metric-large" style={{ color: dominantColor }}>
                  {formatDuration(detail.totalDuration)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary Row */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in animate-stagger-1">
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-card p-4",
                "card-elevated transition-all hover:scale-[1.02]"
              )}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Accent corner */}
              <div
                className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10"
                style={{ backgroundColor: stat.color }}
              />

              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="font-bold text-lg" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zone + HR Charts */}
      <div className="grid gap-4 md:grid-cols-2 animate-fade-in animate-stagger-2">
        <ZoneBreakdownCard zones={detail.zones} />
        <HrTimelineChart records={detail.records} />
      </div>
      
      {/* Detailed Analysis Charts (New) */}
      <div className="grid gap-4 md:grid-cols-2 animate-fade-in animate-stagger-3">
        {hasPaceHrData && <PaceHeartRateChart records={detail.records} />}
        {hasAltitudeData && <ElevationAnalysisChart records={detail.records} />}
      </div>

      {/* Map */}
      {hasGpsData && (
        <Card className="card-elevated animate-fade-in animate-stagger-3 overflow-hidden relative">
          {/* Accent bar */}
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{ background: `linear-gradient(90deg, #208581, #208581aa)` }}
          />

          <CardHeader className="pb-3 pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#208581]/10">
                <MapPin className="w-4 h-4 text-[#208581]" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Route Map</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">GPS track visualization</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-[450px]">
            <MapView tracks={[detail.records]} />
          </CardContent>
        </Card>
      )}

      {/* Altitude/Zone Chart */}
      {hasAltitudeData && (
        <div className="animate-fade-in animate-stagger-4 space-y-6">
          <HeartRateZoneChartV2
            records={detail.records}
            showTemperature={detail.records.some((r) => r.temperature !== null)}
          />
          <HeartRateAnalysisTable
            records={detail.records}
            zones={detail.zones}
            totalDuration={detail.totalDuration}
          />
        </div>
      )}

      {/* Heart Rate Recovery After Hill Peaks */}
      {hasAltitudeData && (
        <div className="animate-fade-in animate-stagger-5">
          <HeartRateRecoveryTable records={detail.records} />
        </div>
      )}
    </div>
  );
}
