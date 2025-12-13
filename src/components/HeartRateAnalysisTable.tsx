import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity as ActivityIcon } from "lucide-react";
import type { TrackRecord, ZoneTimes, Zone } from "@/lib/types";
import { formatDuration, ZONE_CONFIG, ZONE_KEYS } from "@/lib/zones";

interface HeartRateAnalysisTableProps {
  records: TrackRecord[];
  zones: ZoneTimes;
  totalDuration: number;
}

export function HeartRateAnalysisTable({ records, zones, totalDuration }: HeartRateAnalysisTableProps) {
  const stats = useMemo(() => {
    // Initialize stats for each zone
    const zoneStats: Record<Zone, { count: number; sumHR: number; minHR: number; maxHR: number }> = {
      zone1: { count: 0, sumHR: 0, minHR: Infinity, maxHR: 0 },
      zone2: { count: 0, sumHR: 0, minHR: Infinity, maxHR: 0 },
      zone3: { count: 0, sumHR: 0, minHR: Infinity, maxHR: 0 },
      zone4: { count: 0, sumHR: 0, minHR: Infinity, maxHR: 0 },
      zone5: { count: 0, sumHR: 0, minHR: Infinity, maxHR: 0 },
    };

    // Aggregate data from records
    records.forEach(r => {
      if (r.heartRate !== null && r.zone) {
        const current = zoneStats[r.zone];
        if (current) {
          current.count++;
          current.sumHR += r.heartRate;
          current.minHR = Math.min(current.minHR, r.heartRate);
          current.maxHR = Math.max(current.maxHR, r.heartRate);
        }
      }
    });

    return ZONE_KEYS.map(key => {
      const s = zoneStats[key];
      const duration = zones[key];
      const percent = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
      
      return {
        key,
        name: ZONE_CONFIG[key].name,
        color: ZONE_CONFIG[key].color,
        duration,
        percent,
        avgHR: s.count > 0 ? Math.round(s.sumHR / s.count) : 0,
        minHR: s.count > 0 ? s.minHR : 0,
        maxHR: s.count > 0 ? s.maxHR : 0,
        hasData: s.count > 0
      };
    });
  }, [records, zones, totalDuration]);

  // Filter out zones with no duration if desired, or keep to show 0s. 
  // Usually showing all zones is better for completeness.

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#EA4B60]/10">
            <ActivityIcon className="w-4 h-4 text-[#EA4B60]" />
          </div>
          <CardTitle className="text-base font-bold">Heart Rate Analysis</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Zone</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right">% Time</TableHead>
              <TableHead className="text-right">Avg HR</TableHead>
              <TableHead className="text-right">Range</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((row) => (
              <TableRow key={row.key} className="hover:bg-muted/40 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {formatDuration(row.duration)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {row.percent.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {row.hasData ? `${row.avgHR} bpm` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {row.hasData ? `${row.minHR} - ${row.maxHR} bpm` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
