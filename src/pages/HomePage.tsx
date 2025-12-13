import { useEffect, useState } from "react";
import { parseISO, startOfYear, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZoneBar } from "@/components/ZoneBar";
import { PageHeader } from "@/components/PageHeader";
import { YearSummaryChart } from "@/components/YearSummaryChart";
import { DailyVolumeChart } from "@/components/DailyVolumeChart";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { api } from "@/lib/api";
import type { Activity, ZoneTimes } from "@/lib/types";
import { formatDuration, ZONE_CONFIG, ZONE_KEYS } from "@/lib/zones";
import { Activity as ActivityIcon, Clock, Mountain, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUnits } from "@/lib/units";

interface Stats {
  totalActivities: number;
  totalDuration: number;
  totalDistance: number;
  totalElevation: number;
  totalZones: ZoneTimes;
}

function calculateStats(activities: Activity[]): Stats {
  const totalZones: ZoneTimes = {
    zone1: 0,
    zone2: 0,
    zone3: 0,
    zone4: 0,
    zone5: 0,
  };

  let totalDuration = 0;
  let totalDistance = 0;
  let totalElevation = 0;

  for (const activity of activities) {
    totalDuration += activity.totalDuration;
    totalDistance += (activity.totalDistance || 0) / 1000; // km
    totalElevation += activity.elevationGain || 0;
    totalZones.zone1 += activity.zones.zone1;
    totalZones.zone2 += activity.zones.zone2;
    totalZones.zone3 += activity.zones.zone3;
    totalZones.zone4 += activity.zones.zone4;
    totalZones.zone5 += activity.zones.zone5;
  }

  return {
    totalActivities: activities.length,
    totalDuration,
    totalDistance,
    totalElevation,
    totalZones,
  };
}

type TimeWindow = "ytd" | "90d" | "30d" | "7d" | "all";

const TIME_WINDOWS: Array<{ id: TimeWindow; label: string; days?: number }> = [
  { id: "ytd", label: "YTD" },
  { id: "90d", label: "90D", days: 90 },
  { id: "30d", label: "30D", days: 30 },
  { id: "7d", label: "7D", days: 7 },
  { id: "all", label: "All" },
];



export function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("ytd");
  const { formatDistance, formatElevation, distanceUnit, elevationUnit } = useUnits();

  useEffect(() => {
    async function load() {
      try {
        const data = await api.listActivities();
        setActivities(data);
      } catch (error) {
        console.error("Failed to load activities:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const now = new Date();
  const windowDef = TIME_WINDOWS.find((w) => w.id === timeWindow)!;
  const windowStart =
    timeWindow === "all"
      ? undefined
      : timeWindow === "ytd"
      ? startOfYear(now)
      : subDays(now, windowDef.days!);

  const filteredActivities = activities.filter((a) => {
    const d = parseISO(a.startTime);
    if (windowStart && d < windowStart) return false;
    return true;
  });

  const stats = calculateStats(filteredActivities);

  if (activities.length === 0) {
    return (
      <div>
        <PageHeader breadcrumbs={[{ label: "Home" }]} />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ActivityIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">No activities yet</p>
            <p className="text-sm mt-2">
              Go to Activities to import your first FIT file
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Home" }]} />

      <div className="space-y-8">
        {/* Time Window Filter */}
        <div className="flex flex-wrap items-center gap-1">
          {TIME_WINDOWS.map((w) => (
            <Button
              key={w.id}
              size="sm"
              variant={timeWindow === w.id ? "secondary" : "outline"}
              onClick={() => setTimeWindow(w.id)}
            >
              {w.label}
            </Button>
          ))}
        </div>

        {/* Year Summary - Top of page */}
        <div className="animate-fade-in">
          <YearSummaryChart activities={activities} />
        </div>

        {/* Daily Volume Charts - Month & Week */}
        <div className="grid gap-4 md:grid-cols-2 animate-fade-in animate-stagger-2">
          <DailyVolumeChart activities={filteredActivities} mode="month" />
          <DailyVolumeChart activities={filteredActivities} mode="week" />
        </div>

        {/* All-Time Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in animate-stagger-3">
          {/* Total Distance */}
          <Card className="card-elevated relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#208581]/10 to-transparent rounded-bl-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Distance</CardTitle>
              <div className="p-2 rounded-lg bg-[#208581]/10">
                <Route className="h-4 w-4 text-[#208581]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="metric-hero text-[#208581]">{formatDistance(stats.totalDistance)} {distanceUnit}</div>
              <p className="text-xs text-muted-foreground mt-1">all time</p>
            </CardContent>
          </Card>

          {/* Total Time */}
          <Card className="card-elevated relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#374D81]/10 to-transparent rounded-bl-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Time</CardTitle>
              <div className="p-2 rounded-lg bg-[#374D81]/10">
                <Clock className="h-4 w-4 text-[#374D81]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="metric-hero text-[#374D81]">{formatDuration(stats.totalDuration)}</div>
              <p className="text-xs text-muted-foreground mt-1">all time</p>
            </CardContent>
          </Card>

          {/* Total Elevation */}
          <Card className="card-elevated relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#F3D16E]/10 to-transparent rounded-bl-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Elevation</CardTitle>
              <div className="p-2 rounded-lg bg-[#F3D16E]/10">
                <Mountain className="h-4 w-4 text-[#F3D16E] dark:text-[#FEE726]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="metric-hero text-[#F3D16E] dark:text-[#FEE726]">{formatElevation(stats.totalElevation)} {elevationUnit}</div>
              <p className="text-xs text-muted-foreground mt-1">all time</p>
            </CardContent>
          </Card>

          {/* Total Activities */}
          <Card className="card-elevated relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#EA4B60]/10 to-transparent rounded-bl-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Activities</CardTitle>
              <div className="p-2 rounded-lg bg-[#EA4B60]/10">
                <ActivityIcon className="h-4 w-4 text-[#EA4B60]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="metric-hero text-[#EA4B60]">{stats.totalActivities}</div>
              <p className="text-xs text-muted-foreground mt-1">all time</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Heatmap */}
        <div className="animate-fade-in animate-stagger-5">
          <ActivityHeatmap activities={filteredActivities} />
        </div>

        {/* Training Zones */}
        <Card className="card-elevated animate-fade-in animate-stagger-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold">Training Zones ({new Date().getFullYear()})</CardTitle>
            <p className="text-xs text-muted-foreground">Time distribution this year</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Large interactive zone bar */}
              <ZoneBar zones={stats.totalZones} className="h-8" interactive />

              {/* Zone breakdown - 5 columns on larger screens */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ZONE_KEYS.map((key) => {
                  const config = ZONE_CONFIG[key];
                  const duration = stats.totalZones[key];
                  const total = ZONE_KEYS.reduce((sum, k) => sum + stats.totalZones[k], 0);
                  const percentage = total > 0 ? ((duration / total) * 100).toFixed(0) : 0;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-all",
                        "hover:bg-muted/50 border"
                      )}
                    >
                      <div
                        className={cn("w-3 h-3 rounded-full", config.colorClass)}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold">{config.name}</span>
                          <span className="text-sm font-bold">{percentage}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(duration)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
