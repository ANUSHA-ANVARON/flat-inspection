import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Card, Screen } from "../src/components/ui";
import { useSession } from "../src/session";
import { colors, font } from "../src/theme";

export default function Settings() {
  const { user, signOut } = useSession();
  const router = useRouter();
  return (
    <Screen title="Settings">
      <View style={{ padding: 16, gap: 12 }}>
        <Card style={{ gap: 4 }}>
          <Text style={font.section}>{user?.name}</Text>
          <Text style={font.caption}>{user?.role === "admin" ? "Administrator" : "Inspector"} · {user?.phone}</Text>
        </Card>
        <Pressable onPress={() => router.push("/admin/unlock")}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[font.body, { flex: 1 }]}>Checklist manager</Text>
            <MaterialIcons name="lock" size={20} color={colors.navy} />
          </Card>
        </Pressable>
        <Card style={{ gap: 4 }}>
          <Text style={font.body}>App version 0.1.0</Text>
          <Text style={font.caption}>Data syncs live with the server while online.</Text>
        </Card>
        <Button label="Log out" variant="danger" onPress={signOut} style={{ borderColor: colors.border }} />
      </View>
    </Screen>
  );
}
