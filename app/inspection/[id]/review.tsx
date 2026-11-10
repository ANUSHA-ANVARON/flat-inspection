import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Modal, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button, Card, Chip, Loading, Screen } from "../../../src/components/ui";
import { colors, font, severityColor } from "../../../src/theme";

const REASONS = ["Room locked", "No power", "No water", "Cannot reach", "Builder restriction", "Other"];

export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inspectionId = id as Id<"inspections">;
  const router = useRouter();
  const s = useQuery(api.review.summary, { inspectionId });
  const setStatus = useMutation(api.items.setStatus);
  const complete = useMutation(api.inspections.complete);
  const [obs, setObs] = useState("");
  const [na, setNa] = useState<{ itemId: Id<"items">; chosen: string; other: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  if (!s) return <Screen title="Review and finish"><Loading /></Screen>;

  const left = s.unchecked.length;
  const rooms = [...new Set(s.unchecked.map((u) => u.room))];
  const max = Math.max(1, ...s.byCategory.map((c) => c.count));

  return (
    <Screen title="Review and finish" footer={<>
      {left > 0 && <Text style={[font.caption, { textAlign: "center", color: colors.defect }]}>{left} rows still unchecked</Text>}
      <Button label="Complete inspection" disabled={left > 0} onPress={() => setConfirm(true)} />
    </>}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["critical", "major", "minor"] as const).map((k) => (
            <Card key={k} style={{ flex: 1, alignItems: "center", padding: 12 }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: severityColor[k] }}>{s.severity[k]}</Text>
              <Text style={font.caption}>{k[0].toUpperCase() + k.slice(1)}</Text>
            </Card>
          ))}
        </View>
        <Text style={font.section}>Total defects: {s.totalDefects}</Text>

        {left > 0 && (
          <Card style={{ gap: 8 }}>
            <Text style={[font.section, { color: colors.defect }]}>{left} rows still unchecked</Text>
            {rooms.map((r) => (
              <View key={r} style={{ gap: 6 }}>
                <Text style={{ fontWeight: "700", color: colors.navy }}>{r}</Text>
                {s.unchecked.filter((u) => u.room === r).slice(0, 8).map((u) => (
                  <View key={u.itemId} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[font.body, { flex: 1, fontSize: 13 }]} onPress={() => router.push(`/room/${u.roomId}/${u.categoryNumber}`)}>{u.category} · {u.name}</Text>
                    <Text style={{ color: colors.navy, fontSize: 12, textDecorationLine: "underline" }} onPress={() => setNa({ itemId: u.itemId, chosen: REASONS[0], other: "" })}>Mark not accessible</Text>
                  </View>
                ))}
                {s.unchecked.filter((u) => u.room === r).length > 8 && <Text style={font.caption}>…and {s.unchecked.filter((u) => u.room === r).length - 8} more</Text>}
              </View>
            ))}
          </Card>
        )}

        <Card style={{ gap: 8 }}>
          <Text style={font.section}>Defects by category</Text>
          {s.byCategory.length === 0 && <Text style={font.caption}>No defects recorded.</Text>}
          {s.byCategory.map((c) => (
            <View key={c.name} style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 13, color: colors.navy }}>{c.name}</Text><Text style={font.caption}>{c.count}</Text></View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border }}><View style={{ height: 5, borderRadius: 3, width: `${(c.count / max) * 100}%`, backgroundColor: colors.defect }} /></View>
            </View>
          ))}
        </Card>

        {s.limitations.length > 0 && (
          <Card style={{ gap: 6 }}>
            <Text style={font.section}>Limitations</Text>
            {s.limitations.map((l) => <Text key={l.itemId} style={{ fontSize: 13, color: colors.navy }}>{l.room} · {l.name}: <Text style={font.caption}>{l.reason}</Text></Text>)}
          </Card>
        )}

        <Card>
          <Text style={font.section}>General observations</Text>
          <TextInput multiline value={obs} onChangeText={setObs} style={{ minHeight: 100, marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, textAlignVertical: "top" }} />
        </Card>
      </ScrollView>

      <Modal visible={!!na} transparent animationType="slide" onRequestClose={() => setNa(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, gap: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={font.section}>Not accessible: why?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{REASONS.map((r) => <Chip key={r} label={r} selected={na?.chosen === r} onPress={() => setNa((n) => n && { ...n, chosen: r })} />)}</View>
            {na?.chosen === "Other" && <TextInput placeholder="Reason" value={na.other} onChangeText={(t) => setNa((n) => n && { ...n, other: t })} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12 }} />}
            <Button label="Save" disabled={na?.chosen === "Other" && !na.other.trim()} onPress={async () => {
              if (!na) return;
              await setStatus({ itemId: na.itemId, status: "notAccessible", reason: na.chosen === "Other" ? na.other.trim() : na.chosen });
              setNa(null);
            }} />
            <Button label="Cancel" variant="secondary" onPress={() => setNa(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 16, gap: 12 }}>
            <Text style={font.section}>Complete this inspection?</Text>
            <Text style={font.caption}>The data will be locked.</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button style={{ flex: 1 }} label="Cancel" variant="secondary" onPress={() => setConfirm(false)} />
              <Button style={{ flex: 1 }} label="Complete" onPress={async () => {
                try { await complete({ inspectionId, generalObservations: obs || undefined }); setConfirm(false); router.replace(`/inspection/${id}/export`); }
                catch (e: any) { setConfirm(false); Alert.alert("Cannot complete", String(e.message ?? e).replace(/^.*Error: /, "")); }
              }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
