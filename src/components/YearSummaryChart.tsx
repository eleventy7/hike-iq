import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Route, Mountain, Clock, Activity } from "lucide-react";
import type { Activity as ActivityType } from "@/lib/types";
import { formatDuration } from "@/lib/zones";
import { useUnits } from "@/lib/units";

interface YearSummaryChartProps {
  activities: ActivityType[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function YearSummaryChart({ activities }: YearSummaryChartProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const { formatDistance, formatElevation, distanceUnit, elevationUnit, units } = useUnits();

  const { monthlyData, totals } = useMemo(() => {
    // Filter to current year only
    const yearActivities = activities.filter((a) => {
      const date = parseISO(a.startTime);
      return date.getFullYear() === currentYear;
    });

    // Initialize monthly buckets (Jan through current month)
    const monthly: Array<{
      month: string;
      monthIndex: number;
      distance: number;
      elevation: number;
      duration: number;
      count: number;
    }> = [];

    for (let i = 0; i <= currentMonth; i++) {
      monthly.push({
        month: MONTH_NAMES[i],
        monthIndex: i,
        distance: 0,
        elevation: 0,
        duration: 0,
        count: 0,
      });
    }

    // Aggregate data by month
    for (const activity of yearActivities) {
      const date = parseISO(activity.startTime);
      const monthIdx = date.getMonth();

      if (monthIdx <= currentMonth) {
        const bucket = monthly[monthIdx];
        bucket.distance += (activity.totalDistance || 0) / 1000; // km
        bucket.elevation += activity.elevationGain || 0;
        bucket.duration += activity.totalDuration;
        bucket.count += 1;
      }
    }

    // Calculate totals
    const totals = {
      distance: monthly.reduce((sum, m) => sum + m.distance, 0),
      elevation: monthly.reduce((sum, m) => sum + m.elevation, 0),
      duration: monthly.reduce((sum, m) => sum + m.duration, 0),
      count: monthly.reduce((sum, m) => sum + m.count, 0),
    };

    return { monthlyData: monthly, totals };
  }, [activities, currentYear, currentMonth]);

  // Convert chart data based on units
  const chartData = useMemo(() => {
    if (units === "imperial") {
      return monthlyData.map((m) => ({
        ...m,
        distance: m.distance * 0.621371, // km to miles
        elevation: m.elevation * 3.28084, // m to feet
      }));
    }
    return monthlyData;
  }, [monthlyData, units]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-xl text-xs">
          <p className="font-bold mb-2">{data.month} {currentYear}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#208581]" />
              <span className="text-muted-foreground">Distance:</span>
              <span className="font-mono font-medium">{data.distance.toFixed(1)} {distanceUnit}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F3D16E]" />
              <span className="text-muted-foreground">Elevation:</span>
              <span className="font-mono font-medium">{Math.round(data.elevation).toLocaleString()} {elevationUnit}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t mt-1">
              <span className="text-muted-foreground">Activities:</span>
              <span className="font-medium">{data.count}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (totals.count === 0) return null;

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#208581]/10">
            <CalendarDays className="w-4 h-4 text-[#208581]" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">{currentYear} Year Summary</CardTitle>
            <p className="text-xs text-muted-foreground">Monthly distance & elevation</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Left: Stats Table */}
          <div className="flex-shrink-0 w-36 space-y-3 border-r pr-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              YTD Totals
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#208581]/10">
                  <Route className="w-3 h-3 text-[#208581]" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Distance</div>
                  <div className="font-bold text-sm">{formatDistance(totals.distance)} {distanceUnit}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#F3D16E]/10">
                  <Mountain className="w-3 h-3 text-[#F3D16E] dark:text-[#FEE726]" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Elevation</div>
                  <div className="font-bold text-sm">{formatElevation(totals.elevation)} {elevationUnit}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#374D81]/10">
                  <Clock className="w-3 h-3 text-[#374D81]" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Time</div>
                  <div className="font-bold text-sm">{formatDuration(totals.duration)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[#EA4B60]/10">
                  <Activity className="w-3 h-3 text-[#EA4B60]" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Activities</div>
                  <div className="font-bold text-sm">{totals.count}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Chart */}
          <div className="flex-1 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#888" }}
                  dy={10}
                />
                <YAxis
                  yAxisId="distance"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#208581" }}
                  tickFormatter={(v) => `${Math.round(v)}`}
                  width={35}
                />
                <YAxis
                  yAxisId="elevation"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#b4922b" }}
                  tickFormatter={(v) => `${Math.round(v)}`}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                <Bar
                  yAxisId="distance"
                  dataKey="distance"
                  fill="#208581"
                  fillOpacity={0.8}
                  radius={[4, 4, 0, 0]}
                  name={`Distance (${distanceUnit})`}
                />
                <Line
                  yAxisId="elevation"
                  type="monotone"
                  dataKey="elevation"
                  stroke="#F3D16E"
                  strokeWidth={2}
                  dot={{ fill: "#F3D16E", strokeWidth: 0, r: 3 }}
                  name={`Elevation (${elevationUnit})`}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#208581]" />
            <span>Distance ({distanceUnit})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#F3D16E]" />
            <span>Elevation ({elevationUnit})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
