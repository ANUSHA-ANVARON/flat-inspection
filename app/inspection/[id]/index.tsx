import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button, Card, Chip, Field, Loading, Pill, ProgressBar, Screen, SyncChip } from "../../../src/components/ui";
import { useSession } from "../../../src/session";
import { colors, font, severityColor } from "../../../src/theme";

const dot = { notStarted: colors.na, inProgress: colors.gold, done: colors.ok } as const;
const ROOM_TYPES = [["H", "Bedroom"], ["W", "Washroom"], ["B", "Balcony"], ["K", "Kitchen"], ["U", "Utility"], ["S", "Store room"]] as const;

export default function Hub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inspectionId = id as Id<"inspections">;
  const router = useRouter();
  const { user } = useSession();
  const hub = useQuery(api.inspections.hub, { inspectionId });
  const reopen = useMutation(api.inspections.reopen);
  const addRoom = useMutation(api.inspections.addRoomTo);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<string>("W");
  const [name, setName] = useState("");

  if (!hub) return <Screen title="Inspection"><Loading /></Screen>;
  const { inspection: i, rooms } = hub;
  const locked = i.status !== "draft";
  const pct = hub.total ? Math.round((hub.done / hub.total) * 100) : 0;
  const flat = rooms.find((r) => r.type === "F");
  const groups = [...new Set(rooms.filter((r) => r.type !== "F").map((r) => r.group))];
  const defaultName = `${ROOM_TYPES.find((t) => t[0] === type)![1]} ${rooms.filter((r) => r.type === type).length + 1}`;

  return (
    <Screen title={i.customerName} subtitle={`Flat ${i.flatNumber}`} right={<SyncChip />}
      footer={locked ? (
        <>
          <Button label="Export data" onPress={() => router.push(`/inspection/${id}/export`)} />
          {user?.role === "admin" && <Button label="Reopen" variant="secondary" onPress={() => reopen({ inspectionId })} />}
        </>
      ) : <Button label="Review and finish" onPress={() => router.push(`/inspection/${id}/review`)} />}>
      {locked && <View style={{ backgroundColor: colors.navy, padding: 8, alignItems: "center" }}><Text style={{ color: "#fff", fontSize: 12 }}>Completed · Locked</Text></View>}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card style={{ gap: 8 }}>
          <Text style={{ fontSize: 32, fontWeight: "700", color: colors.navy }}>{pct}% <Text style={font.caption}>checked</Text></Text>
          <ProgressBar value={pct} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            {(["critical", "major", "minor"] as const).map((s) => (
              <View key={s} style={{ flex: 1, alignItems: "center", padding: 8, borderRadius: 8, backgroundColor: colors.bg }}>
                <Text style={{ fontSize: 20, fontWeight: "700", color: severityColor[s] }}>{hub.severity[s]}</Text>
                <Text style={font.caption}>{s[0].toUpperCase() + s.slice(1)}</Text>
              </View>
            ))}
          </View>
        </Card>
        {flat && (
          <Pressable onPress={() => router.push(`/room/${flat._id}`)}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot[flat.state as keyof typeof dot] }} />
              <View style={{ flex: 1 }}>
                <Text style={font.section}>Whole flat</Text>
                <Text style={font.caption}>Main door, DB and meter, main valves, handover</Text>
              </View>
              <Text style={[font.caption, font.tabular]}>{flat.done} / {flat.total}</Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.na} />
            </Card>
          </Pressable>
        )}
        {groups.map((g) => (
          <View key={g} style={{ gap: 8 }}>
            <Text style={[font.caption, { textTransform: "uppercase", marginTop: 4 }]}>{g}</Text>
            {rooms.filter((r) => r.group === g && r.type !== "F").map((r) => (
              <Pressable key={r._id} onPress={() => router.push(`/room/${r._id}`)}>
                <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot[r.state as keyof typeof dot] }} />
                  <Text style={[font.body, { flex: 1, fontWeight: "600" }]}>{r.name}</Text>
                  <Text style={[font.caption, font.tabular]}>{r.done} / {r.total}</Text>
                  {r.defects > 0 && <Pill label={`${r.defects}`} color={colors.defect} />}
                  <MaterialIcons name="chevron-right" size={22} color={colors.na} />
                </Card>
              </Pressable>
            ))}
          </View>
        ))}
        {!locked && <Text onPress={() => { setName(""); setAdding(true); }} style={{ color: colors.navy, fontWeight: "600", padding: 8 }}>+ Add room</Text>}
        <Pressable onPress={() => router.push(`/inspection/${id}/areas`)}>
          <Card style={{ gap: 4 }}>
            <Text style={font.section}>Area measurement</Text>
            <Text style={font.caption}>Measured {hub.measuredArea.toFixed(0)} sq ft{hub.agreedCarpet != null ? ` · agreed carpet ${hub.agreedCarpet} sq ft` : ""}</Text>
          </Card>
        </Pressable>
      </ScrollView>
      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 12 }}>
            <Text style={font.section}>Add room</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ROOM_TYPES.map(([c, l]) => <Chip key={c} label={l} selected={type === c} onPress={() => setType(c)} />)}
            </View>
            <Field label="Room name" value={name} placeholder={defaultName} onChangeText={setName} />
            <Button label="Add" onPress={async () => { await addRoom({ inspectionId, type, name: name.trim() || defaultName }); setAdding(false); }} />
            <Button label="Cancel" variant="secondary" onPress={() => setAdding(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
