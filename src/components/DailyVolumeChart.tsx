import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  isSameDay,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CalendarDays, Route, Mountain, Clock, Activity as ActivityIcon } from "lucide-react";
import type { Activity } from "@/lib/types";
import { formatDuration } from "@/lib/zones";
import { useUnits } from "@/lib/units";

interface DailyVolumeChartProps {
  activities: Activity[];
  mode: "week" | "month";
}

export function DailyVolumeChart({ activities, mode }: DailyVolumeChartProps) {
  const today = new Date();
  const { formatDistance, formatElevation, distanceUnit, elevationUnit } = useUnits();

  const { data, totals, periodLabel } = useMemo(() => {
    let start: Date;
    let end: Date;
    let label: string;

    if (mode === "week") {
      start = startOfWeek(today, { weekStartsOn: 1 });
      end = endOfWeek(today, { weekStartsOn: 1 });
      label = `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
    } else {
      start = startOfMonth(today);
      end = endOfMonth(today);
      label = format(today, "MMMM yyyy");
    }

    const days = eachDayOfInterval({ start, end });

    // Filter activities in period (up to today)
    const periodActivities = activities.filter((a) => {
      const activityDate = parseISO(a.startTime);
      return activityDate >= start && activityDate <= today;
    });

    const dailyData = days.map((day) => {
      const dayActivities = activities.filter((a) => {
        const activityDate = parseISO(a.startTime);
        return isSameDay(activityDate, day);
      });

      const duration = dayActivities.reduce((sum, a) => sum + a.totalDuration, 0);
      const count = dayActivities.length;

      return {
        date: day,
        dayLabel: mode === "week" ? format(day, "EEE") : format(day, "d"),
        fullLabel: format(day, "EEE, MMM d"),
        duration,
        count,
        isToday: isSameDay(day, today),
        isFuture: day > today,
      };
    });

    const totals = {
      distance: periodActivities.reduce((sum, a) => sum + ((a.totalDistance || 0) / 1000), 0),
      elevation: periodActivities.reduce((sum, a) => sum + (a.elevationGain || 0), 0),
      duration: periodActivities.reduce((sum, a) => sum + a.totalDuration, 0),
      count: periodActivities.length,
    };

    return { data: dailyData, totals, periodLabel: label };
  }, [activities, mode, today]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      if (d.isFuture) return null;
      return (
        <div className="bg-card border rounded-lg p-2 shadow-xl text-xs">
          <p className="font-bold mb-1">{d.fullLabel}</p>
          <p className="text-[#374D81]">
            <span className="font-medium">Duration:</span>{" "}
            {d.duration > 0 ? formatDuration(d.duration) : "Rest day"}
          </p>
          {d.count > 0 && (
            <p className="text-muted-foreground mt-0.5">
              {d.count} {d.count === 1 ? "activity" : "activities"}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const Icon = mode === "week" ? Calendar : CalendarDays;
  const title = mode === "week" ? "This Week" : "This Month";

  return (
    <Card className="card-elevated h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#374D81]/10">
            <Icon className="w-4 h-4 text-[#374D81]" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
            <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Left: Stats */}
          <div className="flex-shrink-0 w-24 space-y-2 border-r pr-3">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-[#208581]/10">
                <Route className="w-2.5 h-2.5 text-[#208581]" />
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground">Distance</div>
                <div className="font-bold text-xs">{formatDistance(totals.distance)} {distanceUnit}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-[#F3D16E]/10">
                <Mountain className="w-2.5 h-2.5 text-[#F3D16E] dark:text-[#FEE726]" />
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground">Elevation</div>
                <div className="font-bold text-xs">{formatElevation(totals.elevation)} {elevationUnit}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-[#374D81]/10">
                <Clock className="w-2.5 h-2.5 text-[#374D81]" />
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground">Time</div>
                <div className="font-bold text-xs">{formatDuration(totals.duration)}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-[#EA4B60]/10">
                <ActivityIcon className="w-2.5 h-2.5 text-[#EA4B60]" />
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground">Activities</div>
                <div className="font-bold text-xs">{totals.count}</div>
              </div>
            </div>
          </div>

          {/* Right: Chart */}
          <div className="flex-1 h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 5, right: 0, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="dayLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: mode === "week" ? 10 : 8, fill: "#888" }}
                  interval={mode === "week" ? 0 : "preserveStartEnd"}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: "#888" }}
                  tickFormatter={(value) => {
                    if (value === 0) return "0";
                    const hrs = value / 3600;
                    if (hrs >= 1) return `${hrs.toFixed(0)}h`;
                    return `${Math.round(value / 60)}m`;
                  }}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                <Bar dataKey="duration" radius={[3, 3, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.isFuture
                          ? "transparent"
                          : entry.isToday
                          ? "#208581"
                          : entry.duration > 0
                          ? "#374D81"
                          : "#e5e7eb"
                      }
                      fillOpacity={entry.isFuture ? 0 : entry.duration > 0 ? 0.8 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
