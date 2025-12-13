import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ZoomableCard } from "@/components/ui/zoomable-card";
import type { TrackRecord } from "@/lib/types";
import { ZONE_CONFIG } from "@/lib/zones";
import { Heart } from "lucide-react";

interface HrTimelineChartProps {
  records: TrackRecord[];
}

// Zone boundaries with colors from our palette
const ZONE_BOUNDARIES = [
  { hr: 116, label: "Z1/Z2", color: ZONE_CONFIG.zone1.color },
  { hr: 136, label: "Z2/Z3", color: ZONE_CONFIG.zone2.color },
  { hr: 155, label: "Z3/Z4", color: ZONE_CONFIG.zone3.color },
  { hr: 175, label: "Z4/Z5", color: ZONE_CONFIG.zone4.color },
];

export function HrTimelineChart({ records }: HrTimelineChartProps) {
  // Sample data for performance (every Nth record)
  const sampleRate = Math.max(1, Math.floor(records.length / 500));
  const chartData = records
    .filter((_, i) => i % sampleRate === 0)
    .map((r, i) => ({
      index: i,
      hr: r.heartRate ?? 0,
      zone: r.zone,
      time: new Date(r.timestamp).toLocaleTimeString(),
    }));

  return (
    <ZoomableCard
      title="Heart Rate Timeline"
      subtitle="BPM over time with zone boundaries"
      contentHeight="16rem"
      icon={Heart}
      accentColor="#EA4B60"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA4B60" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#374D81" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#208581" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="index" hide />
          <YAxis
            domain={[60, 200]}
            width={36}
            tick={{ fontSize: 11, fill: '#6B6B6B' }}
            axisLine={{ stroke: '#D8D8D2' }}
            tickLine={{ stroke: '#D8D8D2' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-card border rounded-lg px-3 py-2.5 shadow-xl">
                  <p className="metric-medium text-[#EA4B60]">{data.hr} <span className="text-xs font-normal text-muted-foreground">bpm</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{data.time}</p>
                </div>
              );
            }}
          />
          {ZONE_BOUNDARIES.map((b) => (
            <ReferenceLine
              key={b.hr}
              y={b.hr}
              stroke={b.color}
              strokeOpacity={0.5}
              strokeDasharray="4 4"
            />
          ))}
          <Area
            type="monotone"
            dataKey="hr"
            stroke="#EA4B60"
            fill="url(#hrGradient)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ZoomableCard>
  );
}
