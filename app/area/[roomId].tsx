import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button, Card, Field, Loading, Screen } from "../../src/components/ui";
import { colors, font } from "../../src/theme";

type Part = { length: string; width: string };

export default function AreaRoom() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const rid = roomId as Id<"rooms">;
  const router = useRouter();
  const data = useQuery(api.areas.roomParts, { roomId: rid });
  const save = useMutation(api.areas.saveRoom);
  const [parts, setParts] = useState<Part[]>([{ length: "", width: "" }]);
  const [agreed, setAgreed] = useState("");
  useEffect(() => {
    if (!data) return;
    if (data.parts.length) setParts(data.parts.map((p) => ({ length: String(p.length), width: String(p.width) })));
    if (data.room?.agreedArea != null) setAgreed(String(data.room.agreedArea));
  }, [data?.room?._id, data?.parts.length]);
  if (!data?.room) return <Screen title="Area"><Loading /></Screen>;

  const area = (p: Part) => (Number(p.length) || 0) * (Number(p.width) || 0);
  const total = parts.reduce((s, p) => s + area(p), 0);
  const diff = agreed ? total - Number(agreed) : null;
  const edit = (i: number, k: keyof Part, v: string) => setParts(parts.map((p, j) => (j === i ? { ...p, [k]: v.replace(/[^0-9.]/g, "") } : p)));

  return (
    <Screen title={data.room.name} footer={<Button label="Save" onPress={async () => {
      await save({ roomId: rid, agreedArea: agreed ? Number(agreed) : undefined, parts: parts.map((p) => ({ length: Number(p.length) || 0, width: Number(p.width) || 0 })) });
      router.back();
    }} />}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {parts.map((p, i) => (
          <Card key={i}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={font.section}>Part {i + 1}</Text>
              {parts.length > 1 && <Pressable hitSlop={8} onPress={() => setParts(parts.filter((_, j) => j !== i))}><MaterialIcons name="delete-outline" size={22} color={colors.defect} /></Pressable>}
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <View style={{ flex: 1 }}><Field label="Length (ft)" keyboardType="decimal-pad" value={p.length} onChangeText={(v) => edit(i, "length", v)} /></View>
              <View style={{ flex: 1 }}><Field label="Width (ft)" keyboardType="decimal-pad" value={p.width} onChangeText={(v) => edit(i, "width", v)} /></View>
            </View>
            <Text style={{ textAlign: "right", fontWeight: "700", color: colors.navy }}>{area(p).toFixed(1)} sq ft</Text>
          </Card>
        ))}
        <Text onPress={() => setParts([...parts, { length: "", width: "" }])} style={{ color: colors.navy, fontWeight: "600" }}>+ Add another part</Text>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.navy }}>Total room area {total.toFixed(1)} sq ft</Text>
          <View style={{ height: 8 }} />
          <Field label="Agreed area for this room (optional)" suffix="sq ft" keyboardType="decimal-pad" value={agreed} onChangeText={(v) => setAgreed(v.replace(/[^0-9.]/g, ""))} />
          {diff != null && <Text style={{ color: diff < 0 ? colors.defect : colors.ok, fontWeight: "600" }}>Variance {diff.toFixed(1)} sq ft</Text>}
        </Card>
      </ScrollView>
    </Screen>
  );
}
