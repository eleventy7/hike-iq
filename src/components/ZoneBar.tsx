import type { ZoneTimes } from "@/lib/types";
import { ZONE_CONFIG, ZONE_KEYS } from "@/lib/zones";
import { cn } from "@/lib/utils";

interface ZoneBarProps {
  zones: ZoneTimes;
  className?: string;
  interactive?: boolean;
}

export function ZoneBar({ zones, className, interactive = false }: ZoneBarProps) {
  const total = ZONE_KEYS.reduce((sum, key) => sum + zones[key], 0);

  if (total === 0) {
    return <div className={cn("h-3 bg-muted rounded-full", className)} />;
  }

  return (
    <div className={cn("flex h-3 rounded-full overflow-hidden shadow-inner", className)}>
      {ZONE_KEYS.map((key) => {
        const percentage = (zones[key] / total) * 100;
        if (percentage === 0) return null;
        return (
          <div
            key={key}
            className={cn(
              ZONE_CONFIG[key].gradientClass,
              interactive && "zone-segment cursor-pointer"
            )}
            style={{ width: `${percentage}%` }}
            title={`${ZONE_CONFIG[key].name}: ${percentage.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}
