import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type UnitSystem = "metric" | "imperial";

interface UnitsContextValue {
  units: UnitSystem;
  setUnits: (units: UnitSystem) => void;
  formatDistance: (km: number) => string;
  formatElevation: (meters: number) => string;
  formatSpeed: (kmh: number) => string;
  distanceUnit: string;
  elevationUnit: string;
  speedUnit: string;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

const STORAGE_KEY = "hikeiq-units";

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<UnitSystem>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "metric" || stored === "imperial") {
        return stored;
      }
    }
    return "metric";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, units);
  }, [units]);

  const setUnits = (newUnits: UnitSystem) => {
    setUnitsState(newUnits);
  };

  const formatDistance = (km: number): string => {
    if (units === "imperial") {
      const miles = km * 0.621371;
      return miles.toFixed(1);
    }
    return km.toFixed(1);
  };

  const formatElevation = (meters: number): string => {
    if (units === "imperial") {
      const feet = meters * 3.28084;
      return Math.round(feet).toLocaleString();
    }
    return Math.round(meters).toLocaleString();
  };

  const formatSpeed = (kmh: number): string => {
    if (units === "imperial") {
      const mph = kmh * 0.621371;
      return mph.toFixed(1);
    }
    return kmh.toFixed(1);
  };

  const distanceUnit = units === "imperial" ? "mi" : "km";
  const elevationUnit = units === "imperial" ? "ft" : "m";
  const speedUnit = units === "imperial" ? "mph" : "km/h";

  return (
    <UnitsContext.Provider
      value={{
        units,
        setUnits,
        formatDistance,
        formatElevation,
        formatSpeed,
        distanceUnit,
        elevationUnit,
        speedUnit,
      }}
    >
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits(): UnitsContextValue {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error("useUnits must be used within a UnitsProvider");
  }
  return context;
}
