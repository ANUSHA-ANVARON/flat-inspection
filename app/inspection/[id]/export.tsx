import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Share, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button, Card, Loading, Screen } from "../../../src/components/ui";
import { colors, font } from "../../../src/theme";

export default function Export() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inspectionId = id as Id<"inspections">;
  const router = useRouter();
  const s = useQuery(api.review.summary, { inspectionId });
  const data = useQuery(api.review.exportData, { inspectionId });
  if (!s || !data) return <Screen title="Export"><Loading /></Screen>;

  const share = () => Share.share({ title: `Inspection ${data.inspection?.flatNumber}`, message: JSON.stringify(data, null, 2) });
  return (
    <Screen title="Inspection completed" back={false}
      footer={<><Button label="Export data" onPress={share} /><Button label="Back to home" variant="secondary" onPress={() => router.dismissAll()} /></>}>
      <View style={{ padding: 16, gap: 16, alignItems: "center" }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", marginTop: 16 }}>
          <MaterialIcons name="check" size={52} color="#fff" />
        </View>
        <Text style={font.title}>Inspection completed</Text>
        <Card style={{ alignSelf: "stretch", gap: 6 }}>
          <Text style={font.section}>Export contents</Text>
          {[["Checklist results", s.counts.rows], ["Defects", s.counts.defects], ["Rooms (measurements)", s.counts.rooms], ["Photos", s.counts.photos]].map(([l, n]) => (
            <View key={l as string} style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={font.body}>{l}</Text><Text style={[font.body, font.tabular]}>{n}</Text></View>
          ))}
          <Text style={font.caption}>Format: Standard export (JSON). Photo links are named by room, item and defect.</Text>
        </Card>
      </View>
    </Screen>
  );
}
