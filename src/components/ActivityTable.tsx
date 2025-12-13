import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/zones";
import type { Activity } from "@/lib/types";
import {
  Calendar,
  Clock,
  Route,
  TrendingUp,
  Trash2,
  ChevronRight
} from "lucide-react";
import { useUnits } from "@/lib/units";

interface ActivityTableProps {
  activities: Activity[];
  onSelect: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
}

export function ActivityTable({ activities, onSelect, onDelete }: ActivityTableProps) {
  const { formatDistance, formatElevation, distanceUnit, elevationUnit } = useUnits();

  const handleDelete = (e: React.MouseEvent, activity: Activity) => {
    e.stopPropagation();
    if (confirm(`Delete "${activity.filename}"?`)) {
      onDelete(activity);
    }
  };

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[180px]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Date
              </div>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[120px] text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Duration
              </div>
            </TableHead>
            <TableHead className="w-[120px] text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Route className="w-3.5 h-3.5 text-muted-foreground" />
                Distance
              </div>
            </TableHead>
            <TableHead className="w-[120px] text-right">
              <div className="flex items-center justify-end gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                Elevation
              </div>
            </TableHead>
            <TableHead className="w-[80px] text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => {
            const date = new Date(activity.startTime);
            return (
              <TableRow 
                key={activity.id}
                className="cursor-pointer group hover:bg-muted/40 transition-colors"
                onClick={() => onSelect(activity)}
              >
                <TableCell className="font-medium text-xs">
                  <div className="flex flex-col">
                    <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm truncate max-w-[200px] md:max-w-[300px]">
                    {activity.location ? (
                      <div className="flex flex-col">
                        <span>{activity.location}</span>
                        <span className="text-[10px] text-muted-foreground">{activity.filename.replace('.fit', '').replace('.FIT', '')}</span>
                      </div>
                    ) : (
                      activity.filename.replace('.fit', '').replace('.FIT', '')
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {formatDuration(activity.totalDuration)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {activity.totalDistance ? formatDistance(activity.totalDistance / 1000) : "—"} {distanceUnit}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {activity.elevationGain ? formatElevation(activity.elevationGain) : "—"} {elevationUnit}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDelete(e, activity)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}