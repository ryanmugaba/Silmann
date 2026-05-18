"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type HouseOption = {
  id: string;
  name: string;
};

type HouseContextValue = {
  houses: HouseOption[];
  activeHouseId: string | null;
  activeHouse: HouseOption | null;
  setActiveHouseId: (id: string | null) => void;
};

const HouseContext = createContext<HouseContextValue | null>(null);

export function HouseProvider({
  houses,
  children,
}: {
  houses: HouseOption[];
  children: ReactNode;
}) {
  const [activeHouseId, setActiveHouseId] = useState<string | null>(
    houses[0]?.id ?? null
  );

  const activeHouse = useMemo(
    () => houses.find((h) => h.id === activeHouseId) ?? houses[0] ?? null,
    [houses, activeHouseId]
  );

  const setHouse = useCallback((id: string | null) => {
    setActiveHouseId(id);
  }, []);

  const value = useMemo(
    () => ({
      houses,
      activeHouseId: activeHouse?.id ?? null,
      activeHouse,
      setActiveHouseId: setHouse,
    }),
    [houses, activeHouse, setHouse]
  );

  return (
    <HouseContext.Provider value={value}>{children}</HouseContext.Provider>
  );
}

export function useHouseContext(): HouseContextValue {
  const ctx = useContext(HouseContext);
  if (!ctx) {
    throw new Error("useHouseContext must be used within HouseProvider");
  }
  return ctx;
}

/** @alias useHouseContext */
export const useHouse = useHouseContext;
