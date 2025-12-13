import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mountain, Heart, TrendingDown } from "lucide-react";
import type { TrackRecord } from "@/lib/types";
import { useUnits } from "@/lib/units";

interface HeartRateRecoveryTableProps {
  records: TrackRecord[];
}

interface HillPeak {
  index: number;
  elapsedTime: number;
  altitude: number;
  peakHR: number;
  hr1min: number | null;
  hr2min: number | null;
  hr5min: number | null;
  recovery1min: number | null;
  recovery2min: number | null;
  recovery5min: number | null;
  distance: number;
}

export function HeartRateRecoveryTable({ records }: HeartRateRecoveryTableProps) {
  const { formatElevation, distanceUnit, elevationUnit, units } = useUnits();

  const hillPeaks = useMemo(() => {
    // Filter valid points with altitude and heart rate
    const validRecords = records.filter(
      (r) => r.altitude !== null && r.heartRate !== null
    );

    if (validRecords.length < 20) return [];

    // Helper to find records within a time window
    const findRecordsInTimeWindow = (
      centerIdx: number,
      windowSeconds: number
    ) => {
      const centerTime = validRecords[centerIdx].elapsedTime;
      const result: { idx: number; altitude: number }[] = [];

      // Look backwards
      for (let i = centerIdx - 1; i >= 0; i--) {
        if (centerTime - validRecords[i].elapsedTime > windowSeconds) break;
        result.push({ idx: i, altitude: validRecords[i].altitude! });
      }
      // Look forwards
      for (let i = centerIdx + 1; i < validRecords.length; i++) {
        if (validRecords[i].elapsedTime - centerTime > windowSeconds) break;
        result.push({ idx: i, altitude: validRecords[i].altitude! });
      }
      return result;
    };

    // Find local maxima using time-based windows
    const peakWindowSeconds = 60; // Point must be highest within 60s window
    const minProminence = 15; // meters drop after peak
    const minTimeBetweenPeaks = 120; // seconds between peaks
    const prominenceWindowSeconds = 300; // Look 5 min ahead for prominence

    const peaks: number[] = [];

    for (let i = 0; i < validRecords.length; i++) {
      const currentAlt = validRecords[i].altitude!;
      const currentTime = validRecords[i].elapsedTime;

      // Check if this is a local maximum within the time window
      const neighbors = findRecordsInTimeWindow(i, peakWindowSeconds);
      const isLocalMax = neighbors.every((n) => currentAlt >= n.altitude);

      if (!isLocalMax) continue;

      // Check prominence: find minimum altitude in the next 5 minutes
      let minAfter = currentAlt;
      for (let j = i + 1; j < validRecords.length; j++) {
        if (validRecords[j].elapsedTime - currentTime > prominenceWindowSeconds)
          break;
        if (validRecords[j].altitude! < minAfter) {
          minAfter = validRecords[j].altitude!;
        }
      }

      const prominence = currentAlt - minAfter;
      if (prominence < minProminence) continue;

      // Check minimum time from last peak
      const lastPeak = peaks[peaks.length - 1];
      if (lastPeak !== undefined) {
        const timeDiff = currentTime - validRecords[lastPeak].elapsedTime;
        if (timeDiff < minTimeBetweenPeaks) continue;
      }

      peaks.push(i);
    }

    // Calculate HR recovery for each peak
    const hillPeakData: HillPeak[] = peaks.map((peakIdx) => {
      const peakRecord = validRecords[peakIdx];
      const peakTime = peakRecord.elapsedTime;

      // Find HR at 1, 2, 5 minutes after peak
      const findHRAtOffset = (offsetSeconds: number): number | null => {
        const targetTime = peakTime + offsetSeconds;
        // Find the closest record to target time
        let closest: TrackRecord | null = null;
        let closestDiff = Infinity;

        for (let i = peakIdx; i < validRecords.length; i++) {
          const r = validRecords[i];
          const diff = Math.abs(r.elapsedTime - targetTime);
          if (diff < closestDiff) {
            closestDiff = diff;
            closest = r;
          }
          // Stop if we're past the target and getting further away
          if (r.elapsedTime > targetTime && diff > closestDiff) break;
        }

        // Only return if within 15 seconds of target
        if (closest && closestDiff <= 15 && closest.heartRate !== null) {
          return closest.heartRate;
        }
        return null;
      };

      const hr1min = findHRAtOffset(60);
      const hr2min = findHRAtOffset(120);
      const hr5min = findHRAtOffset(300);

      const peakHR = peakRecord.heartRate!;

      return {
        index: peakIdx,
        elapsedTime: peakTime,
        altitude: peakRecord.altitude!,
        peakHR,
        hr1min,
        hr2min,
        hr5min,
        recovery1min: hr1min !== null ? peakHR - hr1min : null,
        recovery2min: hr2min !== null ? peakHR - hr2min : null,
        recovery5min: hr5min !== null ? peakHR - hr5min : null,
        distance: (peakRecord.distance || 0) / 1000,
      };
    });

    // Filter out peaks without any recovery data
    return hillPeakData.filter(
      (p) =>
        p.recovery1min !== null ||
        p.recovery2min !== null ||
        p.recovery5min !== null
    );
  }, [records]);

  // Prepare chart data (downsampled elevation profile)
  const chartData = useMemo(() => {
    const validRecords = records.filter(
      (r) => r.altitude !== null && r.distance !== null
    );
    if (validRecords.length === 0) return [];

    // Conversion factors
    const distConv = units === "imperial" ? 0.621371 : 1; // km to mi
    const elevConv = units === "imperial" ? 3.28084 : 1; // m to ft

    // Downsample to ~200 points
    const step = Math.max(1, Math.floor(validRecords.length / 200));
    return validRecords
      .filter((_, i) => i % step === 0)
      .map((r) => ({
        distance: ((r.distance || 0) / 1000) * distConv,
        altitude: (r.altitude || 0) * elevConv,
      }));
  }, [records, units]);

  // Convert peak data for chart
  const convertedPeaks = useMemo(() => {
    const distConv = units === "imperial" ? 0.621371 : 1;
    const elevConv = units === "imperial" ? 3.28084 : 1;
    return hillPeaks.map(p => ({
      ...p,
      distance: p.distance * distConv,
      altitude: p.altitude * elevConv,
    }));
  }, [hillPeaks, units]);

  if (hillPeaks.length === 0) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const RecoveryCell = ({ value }: { value: number | null }) => {
    if (value === null) return <span className="text-muted-foreground">—</span>;

    // Color code: green for good recovery (>20), yellow for moderate (10-20), red for poor (<10)
    let colorClass = "text-red-500";
    if (value >= 20) colorClass = "text-green-500";
    else if (value >= 10) colorClass = "text-yellow-500";

    return (
      <span className={`font-bold ${colorClass}`}>
        -{value} <span className="font-normal text-muted-foreground text-[10px]">bpm</span>
      </span>
    );
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#374D81]/10">
            <Mountain className="w-4 h-4 text-[#374D81]" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">
              Heart Rate Recovery After Hill Peaks
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              HR drop at 1, 2, and 5 minute intervals after summit
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px]">Peak</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right">Altitude</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Heart className="w-3 h-3 text-[#EA4B60]" />
                  Peak HR
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendingDown className="w-3 h-3 text-green-500" />
                  1 min
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendingDown className="w-3 h-3 text-green-500" />
                  2 min
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <TrendingDown className="w-3 h-3 text-green-500" />
                  5 min
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hillPeaks.map((peak, idx) => (
              <TableRow
                key={peak.index}
                className="hover:bg-muted/40 transition-colors"
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#374D81]/10 flex items-center justify-center text-xs font-bold text-[#374D81]">
                      {idx + 1}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {formatTime(peak.elapsedTime)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {formatElevation(peak.altitude)} {elevationUnit}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  <span className="font-bold text-[#EA4B60]">{peak.peakHR}</span>
                  <span className="text-muted-foreground text-[10px] ml-1">bpm</span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  <RecoveryCell value={peak.recovery1min} />
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  <RecoveryCell value={peak.recovery2min} />
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  <RecoveryCell value={peak.recovery5min} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Recovery quality:</span>
            <span className="text-green-500">●</span> Good (≥20 bpm)
            <span className="text-yellow-500">●</span> Moderate (10-19 bpm)
            <span className="text-red-500">●</span> Poor (&lt;10 bpm)
          </div>
        </div>

        {/* Elevation chart with peak markers */}
        {chartData.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-3">
              Detected Peaks
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="distance"
                    type="number"
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(1)}`}
                    unit={` ${distanceUnit}`}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                    tickFormatter={(v) => `${Math.round(v)}${elevationUnit}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border rounded-lg p-2 shadow-lg text-xs">
                            <div className="font-mono">
                              {Number(payload[0].payload.distance).toFixed(2)} {distanceUnit}
                            </div>
                            <div className="text-muted-foreground">
                              {Math.round(payload[0].payload.altitude).toLocaleString()} {elevationUnit}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="altitude"
                    fill="#374D81"
                    fillOpacity={0.2}
                    stroke="#374D81"
                    strokeWidth={1.5}
                  />
                  {/* Peak markers */}
                  {convertedPeaks.map((peak, idx) => (
                    <ReferenceDot
                      key={peak.index}
                      x={peak.distance}
                      y={peak.altitude}
                      r={0}
                      label={{
                        value: idx + 1,
                        position: "top",
                        fill: "#374D81",
                        fontSize: 11,
                        fontWeight: "bold",
                        dy: -4,
                      }}
                    />
                  ))}
                  {convertedPeaks.map((peak) => (
                    <ReferenceDot
                      key={`dot-${peak.index}`}
                      x={peak.distance}
                      y={peak.altitude}
                      r={4}
                      fill="#374D81"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
