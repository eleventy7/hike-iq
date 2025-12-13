import { useEffect, useState, useMemo } from "react";
import { parseISO } from "date-fns";
import { ActivityCard } from "@/components/ActivityCard";
import { ActivityTable } from "@/components/ActivityTable";
import { ActivityDetailView } from "@/components/ActivityDetailView";
import { ImportButton } from "@/components/ImportButton";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  Upload,
  Calendar,
  Clock,
  FileText,
  Route,
  Mountain,
  Zap,
  Filter,
  X
} from "lucide-react";

type SortField = "activityDate" | "filename" | "totalDuration" | "totalDistance" | "elevationGain" | "intensityMinutes";
type SortDirection = "asc" | "desc";
type ViewMode = "grid" | "list";

// Intensity multipliers per zone (similar to Garmin intensity minutes)
const ZONE_MULTIPLIERS = {
  zone1: 0,   // Recovery - doesn't count
  zone2: 1,   // Light
  zone3: 2,   // Moderate
  zone4: 3,   // Hard
  zone5: 4,   // Max
};

function calculateIntensityMinutes(activity: Activity): number {
  const { zones } = activity;
  return (
    (zones.zone1 / 60) * ZONE_MULTIPLIERS.zone1 +
    (zones.zone2 / 60) * ZONE_MULTIPLIERS.zone2 +
    (zones.zone3 / 60) * ZONE_MULTIPLIERS.zone3 +
    (zones.zone4 / 60) * ZONE_MULTIPLIERS.zone4 +
    (zones.zone5 / 60) * ZONE_MULTIPLIERS.zone5
  );
}

interface Filters {
  country: string | null;
  dateRange: "all" | "7d" | "30d" | "90d" | "ytd" | "1y";
  minElevationGain: number | null;
  maxElevationGain: number | null;
}

export function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("activityDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    country: null,
    dateRange: "all",
    minElevationGain: null,
    maxElevationGain: null,
  });

  // Extract unique countries from activities
  const countries = useMemo(() => {
    const locationSet = new Set<string>();
    activities.forEach((a) => {
      if (a.location) {
        // Extract country from location (assuming format like "City, Country" or just "Country")
        const parts = a.location.split(",").map((p) => p.trim());
        const country = parts[parts.length - 1];
        if (country) locationSet.add(country);
      }
    });
    return Array.from(locationSet).sort();
  }, [activities]);

  // Get elevation range for filter hints
  const elevationRange = useMemo(() => {
    const gains = activities.map((a) => a.elevationGain || 0).filter((g) => g > 0);
    if (gains.length === 0) return { min: 0, max: 1000 };
    return { min: Math.min(...gains), max: Math.max(...gains) };
  }, [activities]);

  useEffect(() => {
    async function loadActivities() {
      try {
        const data = await api.listActivities();
        setActivities(data);
      } catch (error) {
        console.error("Failed to load activities:", error);
      } finally {
        setLoading(false);
      }
    }
    loadActivities();
  }, []);

  function handleImport(newActivities: Activity[]) {
    setActivities((prev) => [...newActivities, ...prev]);
  }

  async function handleDelete(activity: Activity) {
    try {
      await api.deleteActivity(activity.id);
      setActivities((prev) => prev.filter((a) => a.id !== activity.id));
    } catch (error) {
      console.error("Failed to delete activity:", error);
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Default to desc for most fields, especially elevation and intensity
      setSortDirection("desc");
    }
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Country filter
      if (filters.country) {
        const parts = (activity.location || "").split(",").map((p) => p.trim());
        const country = parts[parts.length - 1];
        if (country !== filters.country) return false;
      }

      // Date range filter
      if (filters.dateRange !== "all") {
        const activityDate = parseISO(activity.startTime);
        const now = new Date();
        let startDate: Date;

        switch (filters.dateRange) {
          case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "90d":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case "ytd":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case "1y":
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }

        if (activityDate < startDate) return false;
      }

      // Elevation gain filters
      const elevGain = activity.elevationGain || 0;
      if (filters.minElevationGain !== null && elevGain < filters.minElevationGain) return false;
      if (filters.maxElevationGain !== null && elevGain > filters.maxElevationGain) return false;

      return true;
    });
  }, [activities, filters]);

  // Sort filtered activities
  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "activityDate":
          comparison = a.startTime.localeCompare(b.startTime);
          break;
        case "filename":
          comparison = a.filename.localeCompare(b.filename);
          break;
        case "totalDuration":
          comparison = a.totalDuration - b.totalDuration;
          break;
        case "totalDistance":
          comparison = (a.totalDistance || 0) - (b.totalDistance || 0);
          break;
        case "elevationGain":
          comparison = (a.elevationGain || 0) - (b.elevationGain || 0);
          break;
        case "intensityMinutes":
          comparison = calculateIntensityMinutes(a) - calculateIntensityMinutes(b);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredActivities, sortField, sortDirection]);

  const activeFilterCount = [
    filters.country,
    filters.dateRange !== "all",
    filters.minElevationGain !== null,
    filters.maxElevationGain !== null,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      country: null,
      dateRange: "all",
      minElevationGain: null,
      maxElevationGain: null,
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-52 bg-muted rounded-xl animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const breadcrumbs = selectedActivity
    ? [
        { label: "Activities", onClick: () => setSelectedActivity(null) },
        { label: selectedActivity.filename.replace('.fit', '').replace('.FIT', '') },
      ]
    : [{ label: "Activities" }];

  // Empty state
  if (!selectedActivity && activities.length === 0) {
    return (
      <div>
        <PageHeader
          breadcrumbs={breadcrumbs}
          actions={<ImportButton onImport={handleImport} />}
        />
        <Card className="card-elevated">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#374D81]/10 to-[#374D81]/5 flex items-center justify-center">
              <Upload className="w-10 h-10 text-[#374D81]/60" />
            </div>
            <h3 className="metric-medium mb-2">No activities yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Import your first FIT file to start tracking your training zones and performance.
            </p>
            <div className="mt-6">
              <ImportButton onImport={handleImport} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={breadcrumbs}
        actions={!selectedActivity ? <ImportButton onImport={handleImport} /> : undefined}
      />

      {selectedActivity ? (
        <ActivityDetailView activity={selectedActivity} />
      ) : (
        <div className="space-y-4">
          {/* Toolbar: Sort + Filter + View Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Sort Controls */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 flex-wrap">
              <button
                onClick={() => handleSort("activityDate")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  sortField === "activityDate"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar className="w-3 h-3" />
                Date
                <SortIcon field="activityDate" />
              </button>
              <button
                onClick={() => handleSort("elevationGain")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  sortField === "elevationGain"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Mountain className="w-3 h-3" />
                Elevation
                <SortIcon field="elevationGain" />
              </button>
              <button
                onClick={() => handleSort("intensityMinutes")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  sortField === "intensityMinutes"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="w-3 h-3" />
                Intensity
                <SortIcon field="intensityMinutes" />
              </button>
              <button
                onClick={() => handleSort("totalDuration")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  sortField === "totalDuration"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="w-3 h-3" />
                Duration
                <SortIcon field="totalDuration" />
              </button>
              <button
                onClick={() => handleSort("totalDistance")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  sortField === "totalDistance"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Route className="w-3 h-3" />
                Distance
                <SortIcon field="totalDistance" />
              </button>
              <button
                onClick={() => handleSort("filename")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  sortField === "filename"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="w-3 h-3" />
                Name
                <SortIcon field="filename" />
              </button>
            </div>

            {/* Filter + View Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters || activeFilterCount > 0 ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    viewMode === "grid"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    viewMode === "list"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Filters</h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {/* Date Range */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Date Range
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: "all" as const, label: "All" },
                      { id: "7d" as const, label: "7D" },
                      { id: "30d" as const, label: "30D" },
                      { id: "90d" as const, label: "90D" },
                      { id: "ytd" as const, label: "YTD" },
                      { id: "1y" as const, label: "1Y" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFilters((f) => ({ ...f, dateRange: opt.id }))}
                        className={cn(
                          "px-2 py-1 text-xs rounded-md transition-all",
                          filters.dateRange === opt.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country */}
                {countries.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Country
                    </label>
                    <select
                      value={filters.country || ""}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          country: e.target.value || null,
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs rounded-md border bg-background"
                    >
                      <option value="">All countries</option>
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Min Elevation Gain */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Min Elevation Gain (m)
                  </label>
                  <input
                    type="number"
                    value={filters.minElevationGain ?? ""}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        minElevationGain: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    placeholder={`Min: ${Math.round(elevationRange.min)}`}
                    className="w-full px-2 py-1.5 text-xs rounded-md border bg-background"
                  />
                </div>

                {/* Max Elevation Gain */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Max Elevation Gain (m)
                  </label>
                  <input
                    type="number"
                    value={filters.maxElevationGain ?? ""}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        maxElevationGain: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    placeholder={`Max: ${Math.round(elevationRange.max)}`}
                    className="w-full px-2 py-1.5 text-xs rounded-md border bg-background"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Activity Count */}
          <div className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{sortedActivities.length}</span>
            {filteredActivities.length !== activities.length && (
              <span> of {activities.length}</span>
            )}{" "}
            activities
          </div>

          {/* Activity Content */}
          {viewMode === "list" ? (
            <ActivityTable 
              activities={sortedActivities}
              onSelect={setSelectedActivity}
              onDelete={handleDelete}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedActivities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onSelect={setSelectedActivity}
                  onDelete={handleDelete}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
