import { invoke } from "@tauri-apps/api/core";
import type { Activity, ActivityDetail, ZoneSummary } from "./types";

export interface TileMetadata {
  name: string;
  value: string;
}

export const api = {
  importFitFile: (path: string) =>
    invoke<Activity>("import_fit_file", { path }),

  importFitFiles: (paths: string[]) =>
    invoke<Activity[]>("import_fit_files", { paths }),

  listActivities: () =>
    invoke<Activity[]>("list_activities"),

  getActivity: (id: number) =>
    invoke<ActivityDetail>("get_activity", { id }),

  getWeeklySummary: (weekStart: string) =>
    invoke<ZoneSummary>("get_weekly_summary", { weekStart }),

  getMonthlySummary: (monthStart: string) =>
    invoke<ZoneSummary>("get_monthly_summary", { monthStart }),

  deleteActivity: (id: number) =>
    invoke<void>("delete_activity", { id }),

  // Tile server API
  listTileFiles: () =>
    invoke<string[]>("list_tile_files"),

  loadTiles: (name: string) =>
    invoke<TileMetadata[]>("load_tiles", { name }),

  getTile: (z: number, x: number, y: number) =>
    invoke<number[] | null>("get_tile", { z, x, y }),

  getTilesPath: () =>
    invoke<string>("get_tiles_path"),
};
