import { Home, Activity, Map, Mountain, Ruler } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUnits } from "@/lib/units";

export type Page = "home" | "activities" | "map";

interface AppLayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const navItems = [
  { id: "home" as const, label: "Home", icon: Home, color: "#374D81" },
  { id: "activities" as const, label: "Activities", icon: Activity, color: "#EA4B60" },
  { id: "map" as const, label: "Map", icon: Map, color: "#208581" },
];

export function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const { units, setUnits } = useUnits();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen">
        {/* Compact Icon Sidebar */}
        <aside className="w-16 flex-shrink-0 border-r bg-card flex flex-col items-center py-4 gap-2">
          {/* Logo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#208581] to-[#374D81] flex items-center justify-center shadow-md mb-4 cursor-default">
                <Mountain className="w-5 h-5 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p className="font-bold">HikeIQ</p>
            </TooltipContent>
          </Tooltip>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        "hover:bg-muted",
                        isActive && "bg-muted shadow-sm"
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          isActive && "bg-background shadow-sm"
                        )}
                        style={isActive ? { backgroundColor: `${item.color}15` } : undefined}
                      >
                        <item.icon
                          className="w-4 h-4"
                          style={{ color: isActive ? item.color : undefined }}
                        />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Units Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setUnits(units === "metric" ? "imperial" : "metric")}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-muted"
              >
                <div className="p-2 rounded-lg bg-muted/50">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p>{units === "metric" ? "Switch to Imperial (mi/ft)" : "Switch to Metric (km/m)"}</p>
            </TooltipContent>
          </Tooltip>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
