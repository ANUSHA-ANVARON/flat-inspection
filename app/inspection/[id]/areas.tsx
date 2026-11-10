import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, Loading, Screen } from "../../../src/components/ui";
import { colors, font } from "../../../src/theme";

export default function Areas() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const o = useQuery(api.areas.overview, { inspectionId: id as Id<"inspections"> });
  if (!o) return <Screen title="Area measurement"><Loading /></Screen>;
  const short = o.diff != null && o.diff < 0;
  return (
    <Screen title="Area measurement">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}><Text style={font.caption}>Agreed carpet</Text><Text style={{ fontSize: 26, fontWeight: "700", color: colors.navy }}>{o.agreedCarpet ?? "–"}</Text></View>
            <View style={{ flex: 1 }}><Text style={font.caption}>Measured total</Text><Text style={{ fontSize: 26, fontWeight: "700", color: colors.navy }}>{o.carpetMeasured.toFixed(1)}</Text></View>
          </View>
          {o.diff != null && <Text style={{ fontWeight: "600", color: short ? colors.defect : colors.ok }}>{o.diff.toFixed(1)} sq ft ({o.diffPct!.toFixed(1)}%)</Text>}
          <Text style={font.caption}>Carpet total excludes balconies and utility.</Text>
        </Card>
        {["Rooms", "Balconies and utility"].map((g) => (
          <View key={g} style={{ gap: 8 }}>
            <Text style={[font.caption, { textTransform: "uppercase" }]}>{g}</Text>
            {o.list.filter((r) => r.group === g).map((r) => (
              <Pressable key={r.roomId} onPress={() => router.push(`/area/${r.roomId}`)}>
                <Card style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 }}>
                  <Text style={[font.body, { flex: 1 }]}>{r.name}</Text>
                  <Text style={[font.caption, font.tabular]}>{r.measured ? `${r.area.toFixed(1)} sq ft` : "Not measured"}</Text>
                  {r.measured && <MaterialIcons name="check-circle" size={20} color={colors.ok} />}
                </Card>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
