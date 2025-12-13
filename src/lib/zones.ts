export const ZONE_CONFIG = {
  zone1: {
    name: "Recovery",
    color: "#208581",
    colorClass: "bg-zone-1",
    gradientClass: "bg-gradient-to-r from-[#208581] to-[#24A177]"
  },
  zone2: {
    name: "Aerobic",
    color: "#374D81",
    colorClass: "bg-zone-2",
    gradientClass: "bg-gradient-to-r from-[#374D81] to-[#27657D]"
  },
  zone3: {
    name: "Tempo",
    color: "#F3D16E",
    colorClass: "bg-zone-3",
    gradientClass: "bg-gradient-to-r from-[#FEE726] to-[#F3D16E]"
  },
  zone4: {
    name: "Threshold",
    color: "#EA4B60",
    colorClass: "bg-zone-4",
    gradientClass: "bg-gradient-to-r from-[#EA4B60] to-[#FF4834]"
  },
  zone5: {
    name: "VO2max",
    color: "#C3012F",
    colorClass: "bg-zone-5",
    gradientClass: "bg-gradient-to-r from-[#E30A39] to-[#C3012F]"
  },
} as const;

export type ZoneKey = keyof typeof ZONE_CONFIG;

export const ZONE_KEYS: ZoneKey[] = ["zone1", "zone2", "zone3", "zone4", "zone5"];

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
