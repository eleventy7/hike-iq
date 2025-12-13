import { Card } from "@/components/ui/card";
import { ZoneBar } from "@/components/ZoneBar";
import type { Activity } from "@/lib/types";
import { formatDuration, ZONE_CONFIG, ZONE_KEYS } from "@/lib/zones";
import { cn } from "@/lib/utils";
import { Clock, Trash2, ChevronRight, Activity as ActivityIcon, Route } from "lucide-react";
import { useUnits } from "@/lib/units";

interface ActivityCardProps {
  activity: Activity;
  onSelect: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  index?: number;
}

export function ActivityCard({ activity, onSelect, onDelete, index = 0 }: ActivityCardProps) {
  const { formatDistance, distanceUnit } = useUnits();

  // Find dominant zone for accent
  const dominantZone = ZONE_KEYS.reduce((max, key) =>
    activity.zones[key] > activity.zones[max] ? key : max
  , ZONE_KEYS[0]);
  const dominantColor = ZONE_CONFIG[dominantZone].color;

  // Calculate total
  const total = ZONE_KEYS.reduce((sum, key) => sum + activity.zones[key], 0);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${activity.filename}"?`)) {
      onDelete(activity);
    }
  };

  // Format date nicely
  const date = new Date(activity.startTime);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = date.getFullYear();

  return (
    <Card
      className={cn(
        "card-elevated cursor-pointer group relative overflow-hidden",
        "animate-fade-in transition-all duration-300",
        "hover:scale-[1.02] active:scale-[0.98]"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onSelect(activity)}
    >
      {/* Accent gradient based on dominant zone */}
      <div
        className="absolute top-0 left-0 w-full h-1 opacity-80"
        style={{
          background: `linear-gradient(90deg, ${dominantColor}, ${dominantColor}88)`
        }}
      />

      {/* Decorative background element */}
      <div
        className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
        style={{ backgroundColor: dominantColor }}
      />

      <div className="p-5">
        {/* Header: Date and Actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
              style={{ backgroundColor: `${dominantColor}15` }}
            >
              <ActivityIcon className="w-6 h-6" style={{ color: dominantColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{dayName}</span>
                <span className="text-muted-foreground text-sm">{monthDay}, {year}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 font-medium truncate max-w-[200px]">
                {activity.location ? (
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm font-semibold">{activity.location}</span>
                    <span className="opacity-70 text-[10px]">{activity.filename.replace('.fit', '').replace('.FIT', '')}</span>
                  </div>
                ) : (
                  activity.filename.replace('.fit', '').replace('.FIT', '')
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Duration & Distance - Hero Typography */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <div className="metric-large">{formatDuration(activity.totalDuration)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="w-3 h-3" />
              <span>moving time</span>
            </div>
          </div>
          {activity.totalDistance !== undefined && (
            <div>
              <div className="metric-large">{formatDistance(activity.totalDistance / 1000)} <span className="text-sm font-normal text-muted-foreground">{distanceUnit}</span></div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Route className="w-3 h-3" />
                <span>distance</span>
              </div>
            </div>
          )}
        </div>

        {/* Zone Bar with Labels */}
        <div className="space-y-2">
          <ZoneBar zones={activity.zones} className="h-3" interactive />

          {/* Zone Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {ZONE_KEYS.map((key) => {
              const percent = total > 0 ? Math.round((activity.zones[key] / total) * 100) : 0;
              if (percent === 0) return null;
              const config = ZONE_CONFIG[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `${config.color}15`,
                    color: config.color
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  {percent}%
                </div>
              );
            })}
          </div>
        </div>

        {/* View Details Indicator */}
        <div className="flex items-center justify-end mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            <span>View details</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Card>
  );
}
