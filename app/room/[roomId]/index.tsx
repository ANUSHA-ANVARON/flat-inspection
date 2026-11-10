import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, Loading, Pill, ProgressBar, Screen } from "../../../src/components/ui";
import { colors, font } from "../../../src/theme";

export default function Room() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const data = useQuery(api.items.roomCategories, { roomId: roomId as Id<"rooms"> });
  if (!data || !data.room) return <Screen title="Room"><Loading /></Screen>;
  const total = data.categories.reduce((s, c) => s + c.total, 0);
  const done = data.categories.reduce((s, c) => s + c.done, 0);
  const defects = data.categories.reduce((s, c) => s + c.defects, 0);
  return (
    <Screen title={data.room.name}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card style={{ gap: 8 }}>
          <ProgressBar value={total ? (done / total) * 100 : 0} />
          <Text style={font.caption}>{done} / {total} checked · {defects} defects</Text>
          <Pressable onPress={() => router.push(`/room/${roomId}/photos`)} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 }}>
            <MaterialIcons name="photo-camera" size={22} color={colors.navy} />
            <Text style={{ color: colors.navy, fontWeight: "600" }}>Room photos ({data.photoCount})</Text>
          </Pressable>
        </Card>
        {data.categories.map((c) => (
          <Pressable key={c.number} onPress={() => router.push(`/room/${roomId}/${c.number}`)}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56 }}>
              {c.done === c.total ? <MaterialIcons name="check-circle" size={22} color={colors.ok} /> : <MaterialIcons name="radio-button-unchecked" size={22} color={colors.na} />}
              <Text style={[font.body, { flex: 1, fontWeight: "600" }]}>{c.name}</Text>
              <Text style={[font.caption, font.tabular]}>{c.done} / {c.total}</Text>
              {c.defects > 0 && <Pill label={`${c.defects}`} color={colors.defect} />}
              <MaterialIcons name="chevron-right" size={22} color={colors.na} />
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
