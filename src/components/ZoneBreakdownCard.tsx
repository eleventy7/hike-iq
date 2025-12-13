import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ZoneTimes } from "@/lib/types";
import { ZONE_CONFIG, ZONE_KEYS, formatDuration } from "@/lib/zones";
import { cn } from "@/lib/utils";

interface ZoneBreakdownCardProps {
  zones: ZoneTimes;
  title?: string;
}

type ViewMode = "list" | "stacked";

export function ZoneBreakdownCard({ zones, title = "Zone Breakdown" }: ZoneBreakdownCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const total = ZONE_KEYS.reduce((sum, key) => sum + zones[key], 0);

  // Find the max percentage for scaling the stacked view
  const percentages = ZONE_KEYS.map((key) => (total > 0 ? (zones[key] / total) * 100 : 0));
  const maxPercentage = Math.max(...percentages);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">{title}</CardTitle>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-all font-medium",
                viewMode === "list"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("stacked")}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-all font-medium",
                viewMode === "stacked"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Stacked
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "list" ? (
          <div className="space-y-3">
            {ZONE_KEYS.map((key) => {
              const config = ZONE_CONFIG[key];
              const seconds = zones[key];
              const percentage = total > 0 ? (seconds / total) * 100 : 0;

              return (
                <div key={key} className="flex items-center gap-3 group">
                  <div className={cn("w-3 h-3 rounded-full shadow-sm", config.colorClass)} />
                  <span className="text-sm font-medium w-20">{config.name}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(config.gradientClass, "h-full transition-all duration-300 group-hover:brightness-110")}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-16 text-right font-medium">
                    {formatDuration(seconds)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-2">
            {/* Render zones 5 to 1 (5 on top) */}
            {[...ZONE_KEYS].reverse().map((key, idx) => {
              const config = ZONE_CONFIG[key];
              const seconds = zones[key];
              const percentage = total > 0 ? (zones[key] / total) * 100 : 0;
              // Scale width relative to max so the shape is clear
              const scaledWidth = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;

              return (
                <div key={key} className="flex items-center gap-2 w-full group">
                  <span className="text-xs text-muted-foreground w-6 text-right font-medium">
                    Z{5 - idx}
                  </span>
                  <div className="flex-1 flex justify-center">
                    <div
                      className={cn(
                        config.gradientClass,
                        "h-7 rounded-md transition-all duration-200 group-hover:scale-105 group-hover:brightness-110 shadow-sm"
                      )}
                      style={{ width: `${scaledWidth}%`, minWidth: percentage > 0 ? "8px" : "0" }}
                      title={`${config.name}: ${formatDuration(seconds)} (${percentage.toFixed(1)}%)`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-14 text-left font-medium">
                    {formatDuration(seconds)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-3 border-t mt-3">
          <div className="flex justify-between text-sm">
            <span className="font-bold">Total</span>
            <span className="font-bold">{formatDuration(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
