import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid
} from "recharts";
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import type { Activity } from "@/lib/types";
import { formatDuration } from "@/lib/zones";

interface WeeklyVolumeChartProps {
  activities: Activity[];
}

export function WeeklyVolumeChart({ activities }: WeeklyVolumeChartProps) {
  const data = useMemo(() => {
    // Generate last 12 weeks
    const weeks = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const start = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const end = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      
      // Find activities in this week
      const weeklyActivities = activities.filter(a => {
        const date = parseISO(a.startTime);
        return date >= start && date <= end;
      });

      const totalDuration = weeklyActivities.reduce((acc, curr) => acc + curr.totalDuration, 0);

      weeks.push({
        name: format(start, "MMM d"),
        fullName: `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
        duration: totalDuration,
        count: weeklyActivities.length
      });
    }
    return weeks;
  }, [activities]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-xl text-xs">
          <p className="font-bold mb-1">{payload[0].payload.fullName}</p>
          <p className="text-[#374D81]">
            <span className="font-semibold">Duration:</span> {formatDuration(payload[0].value)}
          </p>
          <p className="text-muted-foreground mt-0.5">
            {payload[0].payload.count} activities
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#374D81]/10">
            <BarChart3 className="w-4 h-4 text-[#374D81]" />
          </div>
          <CardTitle className="text-base font-bold">Weekly Volume</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#888' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#888' }}
                tickFormatter={(value) => {
                    const hrs = Math.floor(value / 3600);
                    return `${hrs}h`;
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.duration > 0 ? "#374D81" : "transparent"} 
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
