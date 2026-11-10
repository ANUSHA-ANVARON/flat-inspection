import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "./components/ui";
import { colors, font } from "./theme";

const IDLE_MS = 5 * 60 * 1000;

const Ctx = createContext<{ unlocked: boolean; unlock: () => void; lock: () => void; idle: boolean }>(null as any);
export const useAdmin = () => useContext(Ctx);

/** Wraps the admin stack: gates on unlock, locks after 5 minutes without a touch. */
export function AdminShell() {
  const [unlocked, setUnlocked] = useState(false);
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();
  const segments = useSegments();
  const onUnlock = segments[segments.length - 1] === "unlock";

  const lock = useCallback(() => { setUnlocked(false); clearTimeout(timer.current); }, []);
  const touch = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setIdle(true); setUnlocked(false); }, IDLE_MS);
  }, []);
  const unlock = useCallback(() => { setUnlocked(true); setIdle(false); touch(); }, [touch]);

  useEffect(() => { if (!unlocked && !onUnlock && !idle) router.replace("/admin/unlock"); }, [unlocked, onUnlock, idle]);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Ctx.Provider value={{ unlocked, unlock, lock, idle }}>
      <View style={{ flex: 1 }} onStartShouldSetResponderCapture={() => { if (unlocked) touch(); return false; }}>
        <Stack screenOptions={{ headerShown: false }} />
        {idle && (
          <View style={{ position: "absolute", inset: 0, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
            <MaterialIcons name="lock" size={48} color={colors.gold} />
            <Text style={[font.title, { color: "#fff" }]}>Locked after 5 minutes</Text>
            <Button label="Unlock again" onPress={() => { setIdle(false); router.replace("/admin/unlock"); }} style={{ alignSelf: "stretch" }} />
          </View>
        )}
      </View>
    </Ctx.Provider>
  );
}
