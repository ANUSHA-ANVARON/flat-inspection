import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Doc } from "../convex/_generated/dataModel";

type User = Doc<"users">;
type Session = { user: User | null; ready: boolean; signIn: (u: User) => Promise<void>; signOut: () => Promise<void> };

const KEY = "session.user";
const Ctx = createContext<Session>(null as any);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((s) => { if (s) setUser(JSON.parse(s)); setReady(true); });
  }, []);
  const signIn = async (u: User) => { await AsyncStorage.setItem(KEY, JSON.stringify(u)); setUser(u); };
  const signOut = async () => { await AsyncStorage.removeItem(KEY); setUser(null); };
  return <Ctx.Provider value={{ user, ready, signIn, signOut }}>{children}</Ctx.Provider>;
}
