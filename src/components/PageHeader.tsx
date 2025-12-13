import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isClickable = !!item.onClick;

          return (
            <div key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <button
                onClick={item.onClick}
                disabled={!isClickable}
                className={cn(
                  "px-1 py-0.5 rounded transition-colors",
                  isLast
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                  isClickable && !isLast && "hover:text-foreground hover:bg-muted cursor-pointer"
                )}
              >
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
