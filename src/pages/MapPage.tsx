import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { MapView } from "@/components/MapView";
import { api } from "@/lib/api";
import type { Activity, TrackRecord } from "@/lib/types";

export function MapPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [tracks, setTracks] = useState<TrackRecord[][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.listActivities();
        setActivities(data);

        // Auto-select the most recent activity
        if (data.length > 0) {
          setSelectedIds(new Set([data[0].id]));
        }
      } catch (error) {
        console.error("Failed to load activities:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load track data for selected activities
  useEffect(() => {
    async function loadTracks() {
      const trackPromises = Array.from(selectedIds).map(async (id) => {
        try {
          const detail = await api.getActivity(id);
          return detail.records;
        } catch {
          return [];
        }
      });

      const loadedTracks = await Promise.all(trackPromises);
      setTracks(loadedTracks.filter((t) => t.length > 0));
    }

    if (selectedIds.size > 0) {
      loadTracks();
    } else {
      setTracks([]);
    }
  }, [selectedIds]);

  function toggleActivity(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Filter activities that have GPS data
  const activitiesWithGps = activities.filter((a) => a.totalDuration > 0);

  return (
    <div className="h-full flex flex-col">
      <PageHeader breadcrumbs={[{ label: "Map" }]} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Activity selector */}
        <Card className="lg:col-span-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-2">
            {activitiesWithGps.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">
                No activities with GPS data
              </p>
            ) : (
              <div className="space-y-1">
                {activitiesWithGps.slice(0, 20).map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => toggleActivity(activity.id)}
                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                      selectedIds.has(activity.id)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium truncate">
                      {activity.filename}
                    </div>
                    <div
                      className={`text-xs ${
                        selectedIds.has(activity.id)
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {activity.activityDate}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map */}
        <Card className="lg:col-span-3 overflow-hidden flex flex-col">
          <CardContent className="flex-1 p-0 min-h-[500px]">
            <MapView tracks={tracks} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
