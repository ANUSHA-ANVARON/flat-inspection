import { useQuery } from "convex/react";
import React, { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Card, Loading, Screen } from "../../src/components/ui";
import { colors, font } from "../../src/theme";

export default function Versions() {
  const list = useQuery(api.checklist.versions);
  const [q, setQ] = useState("");
  if (!list) return <Screen title="Version history"><Loading /></Screen>;
  const shown = list.filter((v) => `${v.summary} ${v.admin}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen title="Version history">
      <FlatList
        data={shown}
        keyExtractor={(v) => v._id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListHeaderComponent={<TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.na} style={{ minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", paddingHorizontal: 12, marginBottom: 8 }} />}
        renderItem={({ item }) => (
          <Card style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}><Text style={{ fontWeight: "700", color: colors.navy }}>v{item.version}</Text></View>
              <Text style={font.caption}>{new Date(item.at).toLocaleString()} · {item.admin}</Text>
            </View>
            <Text style={font.body}>{item.summary}</Text>
          </Card>
        )}
      />
    </Screen>
  );
}
