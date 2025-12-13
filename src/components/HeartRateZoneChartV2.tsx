import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { ZoomableCard } from "@/components/ui/zoomable-card";
import type { TrackRecord, Zone } from "@/lib/types";
import { ZONE_CONFIG } from "@/lib/zones";
import { Mountain } from "lucide-react";
import { useUnits } from "@/lib/units";

interface HeartRateZoneChartV2Props {
  records: TrackRecord[];
  age?: number;
  showLegend?: boolean;
  showTemperature?: boolean;
}

// Use our bold color palette
const ZONE_COLORS: Record<Zone, string> = {
  zone1: ZONE_CONFIG.zone1.color,
  zone2: ZONE_CONFIG.zone2.color,
  zone3: ZONE_CONFIG.zone3.color,
  zone4: ZONE_CONFIG.zone4.color,
  zone5: ZONE_CONFIG.zone5.color,
};

const ZONE_NAMES: Record<Zone, string> = {
  zone1: ZONE_CONFIG.zone1.name,
  zone2: ZONE_CONFIG.zone2.name,
  zone3: ZONE_CONFIG.zone3.name,
  zone4: ZONE_CONFIG.zone4.name,
  zone5: ZONE_CONFIG.zone5.name,
};

interface ChartPoint {
  distance: number;
  altitude: number;
  heartRate: number | null;
  zone: Zone;
  temperature: number | null;
  elapsedTime: number;
  timestamp: string;
}

interface ZoneSegment {
  zone: Zone;
  points: ChartPoint[];
}

function downsample(records: TrackRecord[], maxPoints: number): ChartPoint[] {
  const sampleRate = Math.max(1, Math.floor(records.length / maxPoints));
  return records
    .filter((_, i) => i % sampleRate === 0)
    .map((r) => ({
      distance: (r.distance ?? 0) / 1000, // Convert to km
      altitude: r.altitude ?? 0,
      heartRate: r.heartRate,
      zone: r.zone,
      temperature: r.temperature,
      elapsedTime: r.elapsedTime,
      timestamp: r.timestamp,
    }));
}

function groupByZone(points: ChartPoint[]): ZoneSegment[] {
  if (points.length === 0) return [];

  const segments: ZoneSegment[] = [];
  let currentSegment: ZoneSegment = { zone: points[0].zone, points: [points[0]] };

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    if (point.zone === currentSegment.zone) {
      currentSegment.points.push(point);
    } else {
      // Add transition point to current segment
      currentSegment.points.push(point);
      segments.push(currentSegment);
      // Start new segment with transition point
      currentSegment = { zone: point.zone, points: [point] };
    }
  }
  segments.push(currentSegment);

  return segments;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

export function HeartRateZoneChartV2({
  records,
  showLegend = true,
  showTemperature = false,
}: HeartRateZoneChartV2Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);
  const { distanceUnit, elevationUnit, units } = useUnits();

  // Callback ref to set up ResizeObserver when container is available
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) return;

    // Get initial dimensions
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height });
    }

    // Set up observer for future changes
    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observerRef.current.observe(node);
  }, []);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Render chart when dimensions change
  const renderChart = useCallback(() => {
    if (!svgRef.current || records.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const heightNum = dimensions.height;
    const margin = {
      top: 20,
      right: showTemperature ? 80 : 40,
      bottom: 60,
      left: 60,
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = heightNum - margin.top - margin.bottom;

    // Process data
    const rawPoints = downsample(records, 500);
    // Apply unit conversion
    const distConv = units === "imperial" ? 0.621371 : 1; // km to mi
    const elevConv = units === "imperial" ? 3.28084 : 1; // m to ft
    const points = rawPoints.map(p => ({
      ...p,
      distance: p.distance * distConv,
      altitude: p.altitude * elevConv,
    }));
    const segments = groupByZone(points);

    // Check if we have temperature data
    const hasTemperature = showTemperature && points.some((p) => p.temperature !== null);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(points, (d) => d.distance) ?? 0])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([
        (d3.min(points, (d) => d.altitude) ?? 0) - 10,
        (d3.max(points, (d) => d.altitude) ?? 0) + 10,
      ])
      .range([innerHeight, 0]);

    const tempScale = hasTemperature
      ? d3
          .scaleLinear()
          .domain([
            (d3.min(points, (d) => d.temperature) ?? 0) - 5,
            (d3.max(points, (d) => d.temperature) ?? 30) + 5,
          ])
          .range([innerHeight, 0])
      : null;

    // Create main group
    const g = svg
      .attr("width", width)
      .attr("height", heightNum)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Area generator
    const area = d3
      .area<ChartPoint>()
      .x((d) => xScale(d.distance))
      .y0(innerHeight)
      .y1((d) => yScale(d.altitude))
      .curve(d3.curveMonotoneX);

    // Draw zone-colored areas
    segments.forEach((segment) => {
      g.append("path")
        .datum(segment.points)
        .attr("fill", ZONE_COLORS[segment.zone])
        .attr("fill-opacity", 0.6)
        .attr("d", area);
    });

    // Altitude line
    const line = d3
      .line<ChartPoint>()
      .x((d) => xScale(d.distance))
      .y((d) => yScale(d.altitude))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", "#1F2937")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.8)
      .attr("d", line);

    // Temperature line (if enabled and data exists)
    if (hasTemperature && tempScale) {
      const tempLine = d3
        .line<ChartPoint>()
        .defined((d) => d.temperature !== null)
        .x((d) => xScale(d.distance))
        .y((d) => tempScale(d.temperature!))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", "#EF4444")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4")
        .attr("d", tempLine);
    }

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat((d) => `${d} ${distanceUnit}`))
      .selectAll("text")
      .attr("font-size", "11px");

    // Y axis (altitude)
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat((d) => `${d}${elevationUnit}`))
      .selectAll("text")
      .attr("font-size", "11px");

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#6B7280")
      .text(`Altitude (${elevationUnit})`);

    // Temperature axis (if enabled)
    if (hasTemperature && tempScale) {
      g.append("g")
        .attr("transform", `translate(${innerWidth},0)`)
        .call(d3.axisRight(tempScale).ticks(6).tickFormat((d) => `${d}°C`))
        .selectAll("text")
        .attr("font-size", "11px")
        .attr("fill", "#EF4444");
    }

    // X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#6B7280")
      .text(`Distance (${distanceUnit})`);

    // Interactive overlay
    const tooltip = d3.select(tooltipRef.current);

    const overlay = g
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .style("cursor", "crosshair");

    const verticalLine = g
      .append("line")
      .attr("stroke", "#9CA3AF")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("opacity", 0);

    overlay
      .on("mousemove", (event) => {
        const [mouseX] = d3.pointer(event);
        const distance = xScale.invert(mouseX);
        const closestPoint = points.reduce((prev, curr) =>
          Math.abs(curr.distance - distance) < Math.abs(prev.distance - distance) ? curr : prev
        );

        verticalLine
          .attr("x1", xScale(closestPoint.distance))
          .attr("x2", xScale(closestPoint.distance))
          .attr("y1", 0)
          .attr("y2", innerHeight)
          .style("opacity", 1);

        tooltip
          .style("opacity", 1)
          .style("left", `${event.offsetX + 15}px`)
          .style("top", `${event.offsetY - 10}px`)
          .html(`
            <div class="text-xs space-y-1">
              <div><strong>Time:</strong> ${formatTime(closestPoint.elapsedTime)}</div>
              <div><strong>Distance:</strong> ${closestPoint.distance.toFixed(2)} ${distanceUnit}</div>
              <div><strong>Altitude:</strong> ${Math.round(closestPoint.altitude).toLocaleString()} ${elevationUnit}</div>
              ${closestPoint.heartRate ? `<div><strong>HR:</strong> ${closestPoint.heartRate} bpm</div>` : ""}
              <div style="color: ${ZONE_COLORS[closestPoint.zone]}"><strong>Zone:</strong> ${ZONE_NAMES[closestPoint.zone]}</div>
              ${closestPoint.temperature !== null ? `<div><strong>Temp:</strong> ${closestPoint.temperature}°C</div>` : ""}
            </div>
          `);
      })
      .on("mouseleave", () => {
        verticalLine.style("opacity", 0);
        tooltip.style("opacity", 0);
      });
  }, [records, dimensions, showTemperature, units, distanceUnit, elevationUnit]);

  // Run chart rendering when dependencies change
  useEffect(() => {
    renderChart();
  }, [renderChart]);

  const chartContent = (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-card border rounded-lg px-3 py-2 shadow-xl z-10"
        style={{ opacity: 0 }}
      />
    </div>
  );

  const legend = showLegend && (
    <div className="flex flex-wrap justify-center gap-3 mt-4 pt-4 border-t border-border/50">
      {(Object.keys(ZONE_COLORS) as Zone[]).map((zone) => (
        <div
          key={zone}
          className="flex items-center gap-2 px-2.5 py-1 rounded-full transition-all hover:scale-105"
          style={{ backgroundColor: `${ZONE_COLORS[zone]}15` }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: ZONE_COLORS[zone] }}
          />
          <span className="text-xs font-medium" style={{ color: ZONE_COLORS[zone] }}>
            {ZONE_NAMES[zone]}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <ZoomableCard
      title="Altitude by Heart Rate Zone"
      subtitle="Elevation profile colored by training intensity"
      contentHeight="400px"
      icon={Mountain}
      accentColor="#374D81"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0">{chartContent}</div>
        {legend}
      </div>
    </ZoomableCard>
  );
}
