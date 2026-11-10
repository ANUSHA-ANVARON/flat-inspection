import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../convex/_generated/api";
import { Card, Loading, Pill, ProgressBar, Screen, SyncChip } from "../src/components/ui";
import { useDraft } from "../src/draft";
import { useSession } from "../src/session";
import { colors, font } from "../src/theme";

export default function Home() {
  const { user } = useSession();
  const router = useRouter();
  const { reset } = useDraft();
  const [tab, setTab] = useState<"progress" | "completed">("progress");
  const [q, setQ] = useState("");
  const list = useQuery(api.inspections.list, user ? { inspectorId: user._id, completed: tab === "completed" } : "skip");
  const shown = (list ?? []).filter((i) => `${i.customerName} ${i.project} ${i.flatNumber}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen title="My inspections" back={false} right={<View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><SyncChip /><Pressable onPress={() => router.push("/settings")}><MaterialIcons name="account-circle" size={26} color="#fff" /></Pressable></View>}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search inspections..." placeholderTextColor={colors.na}
          style={{ minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12 }} />
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          {(["progress", "completed"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === t ? colors.gold : colors.border }}>
              <Text style={{ fontWeight: tab === t ? "700" : "400", color: colors.navy }}>{t === "progress" ? "In progress" : "Completed"}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {list === undefined ? <Loading /> : (
        <FlatList
          data={shown}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={[font.caption, { textAlign: "center", marginTop: 48 }]}>No inspections yet. Tap + to start.</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/inspection/${item._id}`)}>
              <Card style={{ gap: 6 }}>
                <Text style={{ fontWeight: "700", fontSize: 16, color: colors.navy }}>{item.customerName}</Text>
                <Text style={font.caption}>{item.project}{item.tower ? `, Tower ${item.tower}` : ""}, Flat {item.flatNumber}</Text>
                <Text style={font.caption}>{new Date(item.scheduledAt).toDateString()}</Text>
                <ProgressBar value={item.percent} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={font.caption}>{item.percent}% checked</Text>
                  {item.defectCount > 0 && <Pill label={`${item.defectCount} defects`} color={colors.defect} />}
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
      <Pressable onPress={() => { reset(); router.push("/new/details"); }}
        style={{ position: "absolute", right: 16, bottom: 24, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 20, height: 52, elevation: 4 }}>
        <MaterialIcons name="add" size={22} color={colors.navy} />
        <Text style={{ fontWeight: "700", color: colors.navy }}>New inspection</Text>
      </Pressable>
    </Screen>
  );
}
