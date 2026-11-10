import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Button, Card, Chip, Screen } from "../../src/components/ui";
import { RoomCounts, useDraft } from "../../src/draft";
import { useSession } from "../../src/session";
import { colors, font } from "../../src/theme";

const ROWS: [keyof RoomCounts, string, keyof typeof MaterialIcons.glyphMap, string][] = [
  ["bedrooms", "Bedrooms", "bed", "Bedroom"],
  ["living", "Living / Dining / Drawing", "weekend", "Living / Dining"],
  ["kitchen", "Kitchen", "kitchen", "Kitchen"],
  ["utility", "Utility", "local-laundry-service", "Utility"],
  ["washrooms", "Washrooms", "bathtub", "Washroom"],
  ["balconies", "Balconies", "deck", "Balcony"],
  ["store", "Store room", "inventory-2", "Store room"],
  ["maid", "Maid room", "bedroom-child", "Maid room"],
  ["acArea", "AC unit area", "ac-unit", "AC unit area"],
  ["passage", "Passage / foyer", "door-front", "Passage / foyer"],
];

export default function RoomSetup() {
  const { draft: d, reset } = useDraft();
  const { user } = useSession();
  const router = useRouter();
  const create = useMutation(api.inspections.create);
  const [c, setC] = useState<RoomCounts>({ bedrooms: 2, living: 1, kitchen: 1, utility: 0, washrooms: 2, balconies: 1, store: 0, maid: 0, acArea: 0, passage: 0 });
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => ROWS.flatMap(([k, , , label]) =>
    Array.from({ length: c[k] }, (_, i) => (c[k] === 1 && !["bedrooms", "washrooms", "balconies"].includes(k) ? label : `${label} ${i + 1}`))), [c]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const n = (s: string) => (s ? Number(s) : undefined);
      const id = await create({
        inspectorId: user._id, customerName: d.customerName, customerPhone: d.customerPhone, customerEmail: d.customerEmail || undefined,
        project: d.project, tower: d.tower || undefined, flatNumber: d.flatNumber, floor: d.floor || undefined, builder: d.builder || undefined,
        flatType: d.flatType, service: d.service, scheduledAt: d.scheduledAt,
        agreedCarpet: n(d.agreedCarpet), agreedSuperBuiltUp: n(d.agreedSuperBuiltUp), agreedBalcony: n(d.agreedBalcony), agreedUtility: n(d.agreedUtility),
        rooms: c,
      });
      reset();
      router.dismissAll();
      router.push(`/inspection/${id}`);
    } catch (e: any) { Alert.alert("Could not create inspection", String(e.message ?? e)); }
    finally { setBusy(false); }
  };

  return (
    <Screen title="Set up rooms" footer={<Button label="Create inspection" onPress={submit} loading={busy} disabled={preview.length === 0} />}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <Text style={font.caption}>Choose how many of each. You can rename or add rooms later.</Text>
        {ROWS.map(([k, label, icon]) => (
          <Card key={k} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
            <MaterialIcons name={icon} size={22} color={colors.navy} />
            <Text style={[font.body, { flex: 1, marginLeft: 12 }]}>{label}</Text>
            <Pressable hitSlop={8} onPress={() => setC({ ...c, [k]: Math.max(0, c[k] - 1) })} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="remove" size={22} color={colors.navy} /></Pressable>
            <Text style={[font.section, font.tabular, { width: 24, textAlign: "center" }]}>{c[k]}</Text>
            <Pressable hitSlop={8} onPress={() => setC({ ...c, [k]: c[k] + 1 })} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="add" size={22} color={colors.navy} /></Pressable>
          </Card>
        ))}
        <View style={{ backgroundColor: colors.goldTint, borderRadius: 12, padding: 16, gap: 8 }}>
          <Text style={font.section}>Rooms to be created · {preview.length}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{preview.map((p, i) => <Chip key={i} label={p} />)}</View>
        </View>
      </ScrollView>
    </Screen>
  );
}
