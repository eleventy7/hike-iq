import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { TrackRecord } from "@/lib/types";

interface MapViewProps {
  tracks?: TrackRecord[][];
  center?: [number, number];
  zoom?: number;
}

export function MapView({ tracks = [], center, zoom = 10 }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Calculate center from tracks if not provided
  const calculatedCenter = center || calculateCenter(tracks);

  useEffect(() => {
    if (!mapContainer.current) {
      console.error("Map container not found");
      return;
    }

    let cancelled = false;

    const initMap = () => {
      if (cancelled || !mapContainer.current) return;

      // Skip if container has no dimensions
      const rect = mapContainer.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(initMap);
        return;
      }

      // Use OpenStreetMap raster tiles
      const style: maplibregl.StyleSpecification = {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      };

      try {
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style,
          center: calculatedCenter,
          zoom,
        });

        map.current.addControl(new maplibregl.NavigationControl(), "top-right");

        map.current.on("load", () => {
          addTracksToMap(map.current!, tracks);
        });
      } catch (e) {
        console.error("Failed to create map:", e);
      }
    };

    // Start map initialization on next frame
    requestAnimationFrame(initMap);

    return () => {
      cancelled = true;
      map.current?.remove();
    };
  }, [calculatedCenter, zoom]);

  // Update tracks when they change
  useEffect(() => {
    if (map.current && map.current.loaded()) {
      addTracksToMap(map.current, tracks);
    }
  }, [tracks]);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "400px" }}>
      <div
        ref={mapContainer}
        style={{ width: "100%", height: "100%", minHeight: "400px" }}
        className="rounded-lg"
      />
    </div>
  );
}

function calculateCenter(tracks: TrackRecord[][]): [number, number] {
  const allPoints = tracks.flatMap((t) => t).filter((r) => r.positionLat && r.positionLong);

  if (allPoints.length === 0) {
    // Default to NJ center
    return [-74.4057, 40.0583];
  }

  const sumLat = allPoints.reduce((sum, r) => sum + (r.positionLat || 0), 0);
  const sumLng = allPoints.reduce((sum, r) => sum + (r.positionLong || 0), 0);

  return [sumLng / allPoints.length, sumLat / allPoints.length];
}

function addTracksToMap(map: maplibregl.Map, tracks: TrackRecord[][]) {
  // Remove existing track layers/sources
  tracks.forEach((_, i) => {
    if (map.getLayer(`track-${i}`)) {
      map.removeLayer(`track-${i}`);
    }
    if (map.getSource(`track-${i}`)) {
      map.removeSource(`track-${i}`);
    }
  });

  // Add new tracks
  tracks.forEach((track, i) => {
    const coordinates = track
      .filter((r) => r.positionLat && r.positionLong)
      .map((r) => [r.positionLong!, r.positionLat!]);

    if (coordinates.length < 2) return;

    map.addSource(`track-${i}`, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    });

    map.addLayer({
      id: `track-${i}`,
      type: "line",
      source: `track-${i}`,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#208581",
        "line-width": 4,
        "line-opacity": 0.9,
      },
    });
  });

  // Fit bounds to tracks
  if (tracks.length > 0) {
    const allCoords = tracks
      .flatMap((t) => t)
      .filter((r) => r.positionLat && r.positionLong)
      .map((r) => [r.positionLong!, r.positionLat!] as [number, number]);

    if (allCoords.length > 1) {
      const bounds = allCoords.reduce(
        (bounds, coord) => bounds.extend(coord),
        new maplibregl.LngLatBounds(allCoords[0], allCoords[0])
      );

      map.fitBounds(bounds, { padding: 50 });
    }
  }
}
