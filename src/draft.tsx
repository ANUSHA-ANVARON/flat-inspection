import React, { createContext, useContext, useState } from "react";

export type RoomCounts = {
  bedrooms: number; living: number; kitchen: number; utility: number; washrooms: number;
  balconies: number; store: number; maid: number; acArea: number; passage: number;
};
export type Draft = {
  customerName: string; customerPhone: string; customerEmail: string;
  project: string; tower: string; flatNumber: string; floor: string; builder: string;
  flatType: string; service: string; scheduledAt: number;
  agreedCarpet: string; agreedSuperBuiltUp: string; agreedBalcony: string; agreedUtility: string;
};

export const emptyDraft = (): Draft => ({
  customerName: "", customerPhone: "", customerEmail: "", project: "", tower: "", flatNumber: "", floor: "", builder: "",
  flatType: "2 BHK", service: "Inspection", scheduledAt: Date.now(),
  agreedCarpet: "", agreedSuperBuiltUp: "", agreedBalcony: "", agreedUtility: "",
});

const Ctx = createContext<{ draft: Draft; set: (p: Partial<Draft>) => void; reset: () => void }>(null as any);
export const useDraft = () => useContext(Ctx);

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState(emptyDraft);
  return (
    <Ctx.Provider value={{ draft, set: (p) => setDraft((d) => ({ ...d, ...p })), reset: () => setDraft(emptyDraft()) }}>
      {children}
    </Ctx.Provider>
  );
}
