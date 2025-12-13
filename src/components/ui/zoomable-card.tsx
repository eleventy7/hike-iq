import * as React from "react";
import { Maximize2, Minimize2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ZoomableCardProps {
  title: string;
  /** Render prop that receives isMaximized state */
  children: React.ReactNode | ((isMaximized: boolean) => React.ReactNode);
  className?: string;
  /** Height of the content area when not maximized */
  contentHeight?: string;
  /** Height of the content area when maximized */
  maximizedHeight?: string;
  /** Optional icon to display next to the title */
  icon?: LucideIcon;
  /** Accent color for the icon (hex) */
  accentColor?: string;
  /** Optional subtitle/description */
  subtitle?: string;
}

export function ZoomableCard({
  title,
  children,
  className,
  contentHeight = "16rem",
  maximizedHeight = "calc(100vh - 8rem)",
  icon: Icon,
  accentColor = "#374D81",
  subtitle,
}: ZoomableCardProps) {
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Support both render prop and regular children
  const renderContent = () => {
    if (typeof children === "function") {
      return children(isMaximized);
    }
    return children;
  };

  return (
    <>
      <div
        data-slot="card"
        className={cn(
          "card-elevated bg-card text-card-foreground flex flex-col rounded-xl border overflow-hidden",
          className
        )}
      >
        {/* Accent bar at top */}
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}66)` }}
        />

        <div className="py-5 flex flex-col gap-5">
          <div
            data-slot="card-header"
            className="flex items-center justify-between gap-3 px-5"
          >
            <div className="flex items-center gap-3">
              {Icon && (
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: accentColor }} />
                </div>
              )}
              <div>
                <div data-slot="card-title" className="leading-none font-bold text-sm">
                  {title}
                </div>
                {subtitle && (
                  <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              onClick={() => setIsMaximized(true)}
            >
              <Maximize2 className="h-4 w-4" />
              <span className="sr-only">Maximize</span>
            </Button>
          </div>
          <div data-slot="card-content" className="px-5">
            <div style={{ height: contentHeight }}>
              {!isMaximized && (
                <React.Fragment key="card">{renderContent()}</React.Fragment>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] w-full h-[calc(100vh-2rem)] flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="flex-row items-center justify-between space-y-0 pb-4 border-b">
            <div className="flex items-center gap-3">
              {Icon && (
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: accentColor }} />
                </div>
              )}
              <DialogTitle className="font-bold">{title}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMaximized(false)}
            >
              <Minimize2 className="h-4 w-4" />
              <span className="sr-only">Minimize</span>
            </Button>
          </DialogHeader>
          <div className="flex-1 min-h-0 pt-4" style={{ height: maximizedHeight }}>
            {isMaximized && (
              <React.Fragment key="dialog">{renderContent()}</React.Fragment>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
