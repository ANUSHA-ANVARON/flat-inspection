import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SessionProvider, useSession } from "../src/session";
import { DraftProvider } from "../src/draft";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { unsavedChangesWarning: false });

function Gate() {
  const { user, ready } = useSession();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === "login";
    if (!user && !onLogin) router.replace("/login");
    if (user && onLogin) router.replace("/");
  }, [user, ready, segments]);
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Root() {
  return (
    <ConvexProvider client={convex}>
      <SessionProvider>
        <DraftProvider>
          <StatusBar style="light" />
          <Gate />
        </DraftProvider>
      </SessionProvider>
    </ConvexProvider>
  );
}
