import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { TrackRecord } from "@/lib/types";
import { useUnits } from "@/lib/units";

interface ElevationAnalysisChartProps {
  records: TrackRecord[];
}

export function ElevationAnalysisChart({ records }: ElevationAnalysisChartProps) {
  const { distanceUnit, elevationUnit, units } = useUnits();

  const data = useMemo(() => {
    // 1. Filter valid points
    const points = records.filter(r => 
      r.distance !== null && 
      r.altitude !== null && 
      r.elapsedTime !== null
    );

    // 2. Downsample
    const step = Math.ceil(points.length / 300);
    const sampled = points.filter((_, i) => i % step === 0);

    // 3. Calculate Vertical Speed (VAM) & Smooth
    const windowSize = 5;

    // Conversion factors
    const distanceConversion = units === "imperial" ? 0.000621371 : 0.001; // m to mi or m to km
    const elevationConversion = units === "imperial" ? 3.28084 : 1; // m to ft

    return sampled.map((p, i, arr) => {
      // Look back and forward for smoothing VAM
      const startIdx = Math.max(0, i - windowSize);
      const endIdx = Math.min(arr.length - 1, i + windowSize);

      const startP = arr[startIdx];
      const endP = arr[endIdx];

      const timeDiff = (endP.elapsedTime - startP.elapsedTime) / 3600; // hours
      const altDiffMeters = (endP.altitude! - startP.altitude!); // meters

      // VAM in m/h or ft/h
      let vam = timeDiff > 0.001 ? (altDiffMeters * elevationConversion) / timeDiff : 0;

      // Clamp extreme noise (adjusted for ft/h if imperial)
      const vamLimit = units === "imperial" ? 6000 : 2000;
      if (vam > vamLimit) vam = vamLimit;
      if (vam < -vamLimit) vam = -vamLimit;

      return {
        distance: (p.distance || 0) * distanceConversion,
        altitude: (p.altitude || 0) * elevationConversion,
        vam: vam
      };
    });
  }, [records, units]);

  if (data.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const altVal = payload.find((p: any) => p.dataKey === "altitude")?.value;
      const vamVal = payload.find((p: any) => p.dataKey === "vam")?.value;

      return (
        <div className="bg-card border rounded-lg p-3 shadow-xl text-xs">
          <p className="font-bold mb-2">Distance: {Number(label).toFixed(2)} {distanceUnit}</p>
          {altVal && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#208581]" />
              <span className="text-muted-foreground">Altitude:</span>
              <span className="font-mono font-medium">{Math.round(altVal).toLocaleString()} {elevationUnit}</span>
            </div>
          )}
          {vamVal !== undefined && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F3D16E]" />
              <span className="text-muted-foreground">Vertical Speed:</span>
              <span className="font-mono font-medium">{Math.round(vamVal).toLocaleString()} {elevationUnit}/h</span>
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
            <div className="p-2 rounded-lg bg-[#208581]/10">
              <TrendingUp className="w-4 h-4 text-[#208581]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Terrain Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">Elevation profile & ascent rates</p>
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
                minTickGap={30}
              />
              {/* Left Axis: Altitude */}
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 10, fill: '#208581' }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                label={{ value: `Elev (${elevationUnit})`, angle: -90, position: 'insideLeft', fill: '#208581', fontSize: 10 }}
              />
              {/* Right Axis: VAM */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#b4922b' }}
                axisLine={false}
                tickLine={false}
                domain={units === "imperial" ? [-3000, 3000] : [-1000, 1000]}
                label={{ value: `V.Speed (${elevationUnit}/h)`, angle: 90, position: 'insideRight', fill: '#b4922b', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="altitude"
                fill="#208581"
                fillOpacity={0.2}
                stroke="#208581"
                strokeWidth={2}
              />
              {/* Use Line for VAM as Bar chart with uneven intervals can be tricky in ComposedChart */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="vam"
                stroke="#F3D16E"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
