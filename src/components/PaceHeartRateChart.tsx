import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { TrackRecord } from "@/lib/types";
import { useUnits } from "@/lib/units";

interface PaceHeartRateChartProps {
  records: TrackRecord[];
}

export function PaceHeartRateChart({ records }: PaceHeartRateChartProps) {
  const { distanceUnit, units } = useUnits();

  const data = useMemo(() => {
    // 1. Filter valid points
    const points = records.filter(r => 
      r.distance !== null && 
      r.heartRate !== null && 
      r.speed !== null
    );

    // 2. Downsample for performance (target ~300 points)
    const step = Math.ceil(points.length / 300);
    const sampled = points.filter((_, i) => i % step === 0);

    // 3. Process & Smooth
    // Simple moving average window
    const windowSize = 5;
    
    // Distance conversion factor
    const distanceConversion = units === "imperial" ? 0.000621371 : 0.001; // m to mi or m to km
    // Pace conversion: min/km or min/mi
    const paceMeters = units === "imperial" ? 1609.34 : 1000; // meters per unit

    return sampled.map((p, i, arr) => {
      // Calculate smoothed pace
      let sumSpeed = 0;
      let count = 0;
      for (let j = Math.max(0, i - windowSize); j <= Math.min(arr.length - 1, i + windowSize); j++) {
        if (arr[j].speed) {
          sumSpeed += arr[j].speed!;
          count++;
        }
      }
      const avgSpeed = count > 0 ? sumSpeed / count : 0;

      // Speed (m/s) to Pace (min/unit)
      let pace = avgSpeed > 0.1 ? (paceMeters / avgSpeed) / 60 : 0;

      // Cap pace at 20 min/unit for graph readability (walking/stopped)
      if (pace > 20) pace = 20;

      return {
        distance: (p.distance || 0) * distanceConversion,
        heartRate: p.heartRate,
        pace: pace,
        rawSpeed: avgSpeed
      };
    });
  }, [records, units]);

  if (data.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const paceVal = payload.find((p: any) => p.dataKey === "pace")?.value;
      const hrVal = payload.find((p: any) => p.dataKey === "heartRate")?.value;

      const mins = Math.floor(paceVal);
      const secs = Math.round((paceVal - mins) * 60);
      const paceStr = `${mins}:${secs.toString().padStart(2, '0')}`;

      return (
        <div className="bg-card border rounded-lg p-3 shadow-xl text-xs">
          <p className="font-bold mb-2">Distance: {Number(label).toFixed(2)} {distanceUnit}</p>
          {hrVal && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#EA4B60]" />
              <span className="text-muted-foreground">Heart Rate:</span>
              <span className="font-mono font-medium">{hrVal} bpm</span>
            </div>
          )}
          {paceVal && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#374D81]" />
              <span className="text-muted-foreground">Pace:</span>
              <span className="font-mono font-medium">{paceStr} /{distanceUnit}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#374D81]/10">
              <Activity className="w-4 h-4 text-[#374D81]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Pace & Heart Rate</CardTitle>
              <p className="text-xs text-muted-foreground">Effort vs Speed analysis</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis
                dataKey="distance"
                type="number"
                unit={` ${distanceUnit}`}
                tick={{ fontSize: 10, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                domain={['dataMin', 'dataMax']}
                minTickGap={30}
              />
              {/* Left Axis: Heart Rate */}
              <YAxis 
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 10, fill: '#EA4B60' }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                label={{ value: 'HR (bpm)', angle: -90, position: 'insideLeft', fill: '#EA4B60', fontSize: 10 }}
              />
              {/* Right Axis: Pace (Inverted) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                reversed={true} // Lower pace (faster) is higher up
                tick={{ fontSize: 10, fill: '#374D81' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 20]}
                tickFormatter={(val) => `${val}'`}
                label={{ value: `Pace (min/${distanceUnit})`, angle: 90, position: 'insideRight', fill: '#374D81', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heartRate"
                stroke="#EA4B60"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="pace"
                fill="#374D81"
                fillOpacity={0.1}
                stroke="#374D81"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
