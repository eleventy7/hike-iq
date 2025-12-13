import { useMemo } from "react";
import { format, parseISO, startOfWeek, eachDayOfInterval, endOfWeek, subWeeks } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityHeatmapProps {
  activities: Activity[];
}

export function ActivityHeatmap({ activities }: ActivityHeatmapProps) {
  // Generate last 52 weeks (approx 1 year) grid
  const days = useMemo(() => {
    const today = new Date();
    // Start from 52 weeks ago, aligned to Monday
    const startDate = startOfWeek(subWeeks(today, 51), { weekStartsOn: 1 });
    
    // Generate all days until today (or end of this week)
    const endDate = endOfWeek(today, { weekStartsOn: 1 });
    
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Map activities to a lookup object
    const activityMap: Record<string, number> = {};
    activities.forEach(a => {
      const dateStr = format(parseISO(a.startTime), 'yyyy-MM-dd');
      activityMap[dateStr] = (activityMap[dateStr] || 0) + a.totalDuration;
    });

    return allDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const duration = activityMap[dateStr] || 0;
      
      // Determine intensity level (0-4)
      let level = 0;
      if (duration > 0) {
        if (duration < 1800) level = 1; // < 30 mins
        else if (duration < 3600) level = 2; // < 1 hour
        else if (duration < 7200) level = 3; // < 2 hours
        else level = 4; // > 2 hours
      }

      return {
        date,
        dateStr,
        duration,
        level
      };
    });
  }, [activities]);

  // Group by weeks for the grid
  const weeks = useMemo(() => {
    const weeksArray = [];
    let currentWeek: typeof days = [];
    
    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });
    // Push remaining days if any (shouldn't be if we calculated correctly)
    if (currentWeek.length > 0) weeksArray.push(currentWeek);
    
    return weeksArray;
  }, [days]);

  const getColor = (level: number) => {
    switch (level) {
        case 0: return "bg-muted/30";
        case 1: return "bg-[#208581]/30";
        case 2: return "bg-[#208581]/50";
        case 3: return "bg-[#208581]/75";
        case 4: return "bg-[#208581]";
        default: return "bg-muted/30";
    }
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#208581]/10">
            <CalendarDays className="w-4 h-4 text-[#208581]" />
          </div>
          <CardTitle className="text-base font-bold">Activity Log</CardTitle>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${getColor(0)}`} />
            <div className={`w-2.5 h-2.5 rounded-sm ${getColor(1)}`} />
            <div className={`w-2.5 h-2.5 rounded-sm ${getColor(2)}`} />
            <div className={`w-2.5 h-2.5 rounded-sm ${getColor(3)}`} />
            <div className={`w-2.5 h-2.5 rounded-sm ${getColor(4)}`} />
          </div>
          <span>More</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
           {/* Day labels column */}
           <div className="flex flex-col gap-1 pr-1 pt-4 text-[9px] text-muted-foreground font-medium leading-[10px]">
             <div className="h-2.5">Mon</div>
             <div className="h-2.5 opacity-0">Tue</div>
             <div className="h-2.5">Wed</div>
             <div className="h-2.5 opacity-0">Thu</div>
             <div className="h-2.5">Fri</div>
             <div className="h-2.5 opacity-0">Sat</div>
             <div className="h-2.5">Sun</div>
           </div>

           {/* Weeks grid */}
           {weeks.map((week, wIdx) => (
             <div key={wIdx} className="flex flex-col gap-1">
               {/* Month label logic: show only if it's the first week of the month */}
               {wIdx % 4 === 0 && week[0] ? (
                  <div className="text-[9px] text-muted-foreground h-3 overflow-visible whitespace-nowrap">
                     {format(week[0].date, 'MMM')}
                  </div>
               ) : <div className="h-3" />}
               
               {week.map((day, dIdx) => (
                 <TooltipProvider key={`${wIdx}-${dIdx}`}>
                   <Tooltip delayDuration={0}>
                     <TooltipTrigger asChild>
                       <div 
                         className={cn(
                           "w-2.5 h-2.5 rounded-[2px] transition-colors",
                           getColor(day.level)
                         )}
                       />
                     </TooltipTrigger>
                     <TooltipContent className="text-xs">
                       <div className="font-semibold">{format(day.date, 'EEE, MMM d, yyyy')}</div>
                       {day.duration > 0 ? (
                         <div>{Math.floor(day.duration / 60)} mins</div>
                       ) : (
                         <div className="text-muted-foreground">No activity</div>
                       )}
                     </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
               ))}
             </div>
           ))}
        </div>
      </CardContent>
    </Card>
  );
}
