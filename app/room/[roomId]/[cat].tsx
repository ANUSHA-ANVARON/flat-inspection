import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DefectDraft, DefectSheet } from "../../../src/components/DefectSheet";
import { Button, Card, Chip, Loading, Screen } from "../../../src/components/ui";
import { colors, font, severityColor } from "../../../src/theme";

const NA_REASONS = ["Not provided by builder", "Not in this flat", "Other"];

export default function Category() {
  const { roomId, cat } = useLocalSearchParams<{ roomId: string; cat: string }>();
  const rid = roomId as Id<"rooms">;
  const num = Number(cat);
  const items = useQuery(api.items.categoryItems, { roomId: rid, categoryNumber: num });
  const room = useQuery(api.items.roomCategories, { roomId: rid });
  const setStatus = useMutation(api.items.setStatus);
  const setValue = useMutation(api.items.setValue);
  const markRest = useMutation(api.items.markRestOk);
  const removeDefect = useMutation(api.items.removeDefect);

  const [open, setOpen] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ itemId: Id<"items">; title: string; library: any[]; initial?: DefectDraft } | null>(null);
  const [na, setNa] = useState<{ itemId: Id<"items">; other: string; chosen: string } | null>(null);
  const [menu, setMenu] = useState(false);

  if (!items || !room?.room) return <Screen title="Category"><Loading /></Screen>;
  const catName = items[0]?.categoryName ?? "Category";
  const done = items.filter((i) => i.status !== "unchecked").length;
  const sections = [...new Set(items.map((i) => i.section ?? ""))];
  const nextOpen = items.find((i) => i.status === "unchecked");

  const guard = async (fn: () => Promise<unknown>) => { try { await fn(); } catch (e: any) { Alert.alert("Not saved", String(e.message ?? e).replace(/^.*Error: /, "")); } };

  return (
    <Screen title={catName} subtitle={room.room.name} right={<Text style={{ color: "#fff" }}>{done} / {items.length}</Text>}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button style={{ flex: 1 }} label="Next unchecked" disabled={!nextOpen} onPress={() => nextOpen && setOpen(nextOpen._id)} />
          <Pressable onPress={() => setMenu(true)} style={{ width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="more-horiz" size={24} color={colors.navy} />
          </Pressable>
        </View>
      }>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
        {sections.map((sec) => (
          <View key={sec} style={{ gap: 10 }}>
            {sec ? <Text style={[font.caption, { textTransform: "uppercase" }]}>{sec}</Text> : null}
            {items.filter((i) => (i.section ?? "") === sec).map((it) => {
              const expanded = open === it._id;
              const border = it.status === "defect" ? colors.defect : it.status === "ok" ? colors.ok : "transparent";
              return (
                <Card key={it._id} style={{ borderLeftWidth: 3, borderLeftColor: border, gap: 8 }}>
                  <Pressable onPress={() => setOpen(expanded ? null : it._id)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[font.body, { fontWeight: "700" }]}>{it.name}</Text>
                      {!expanded && <Text style={font.caption} numberOfLines={1}>{it.whatToCheck}</Text>}
                    </View>
                    {it.status === "ok" && <MaterialIcons name="check-circle" size={24} color={colors.ok} />}
                    {it.status === "defect" && <MaterialIcons name="cancel" size={24} color={colors.defect} />}
                    {(it.status === "na" || it.status === "notAccessible") && <MaterialIcons name="remove-circle-outline" size={24} color={colors.na} />}
                    {it.status === "unchecked" && <MaterialIcons name="radio-button-unchecked" size={24} color={colors.border} />}
                  </Pressable>
                  {expanded && (
                    <>
                      <View style={{ backgroundColor: colors.goldTint, borderRadius: 8, padding: 12 }}><Text style={font.body}>{it.whatToCheck}</Text></View>
                      {it.tool ? <Text style={font.caption}>Tool: {it.tool}</Text> : null}
                      {it.extraInput !== "none" && (
                        <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, minHeight: 48 }}>
                          <TextInput defaultValue={it.value ?? ""} keyboardType={it.extraInput === "number" ? "decimal-pad" : "default"}
                            placeholder={it.extraInput === "number" ? "Reading" : "Brand / count / notes"} style={{ flex: 1 }}
                            onEndEditing={(e) => guard(() => setValue({ itemId: it._id, value: e.nativeEvent.text }))} />
                          {it.unit ? <Text style={font.caption}>{it.unit}</Text> : null}
                        </View>
                      )}
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {([["ok", "OK", colors.ok], ["defect", "Defect", colors.defect], ["na", "N/A", colors.na]] as const).map(([k, label, color]) => {
                          const selected = it.status === k;
                          return (
                            <Pressable key={k} style={{ flex: 1, height: 52, borderRadius: 10, borderWidth: 1, borderColor: selected ? color : colors.border, backgroundColor: selected ? color : "#fff", alignItems: "center", justifyContent: "center" }}
                              onPress={() => {
                                if (k === "ok") guard(() => setStatus({ itemId: it._id, status: "ok" }));
                                else if (k === "na") setNa({ itemId: it._id, other: "", chosen: NA_REASONS[0] });
                                else setSheet({ itemId: it._id, title: it.name, library: it.library });
                              }}>
                              <Text style={{ fontWeight: "700", color: selected ? "#fff" : colors.navy }}>{label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {it.status === "na" && it.reason ? <Text style={font.caption}>N/A: {it.reason}</Text> : null}
                      {it.defects.map((d) => (
                        <View key={d._id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: severityColor[d.severity] }} />
                          <Text style={[font.body, { flex: 1, fontSize: 13 }]}>{d.type} · {d.severity[0].toUpperCase() + d.severity.slice(1)} · {d.photoIds.length} photos</Text>
                          <Pressable hitSlop={8} onPress={() => setSheet({ itemId: it._id, title: it.name, library: it.library, initial: { defectId: d._id, type: d.type, severity: d.severity, location: d.location, note: d.note, photoIds: d.photoIds } })}>
                            <MaterialIcons name="edit" size={20} color={colors.navy} />
                          </Pressable>
                          <Pressable hitSlop={8} onPress={() => Alert.alert("Remove defect?", undefined, [{ text: "Cancel" }, { text: "Remove", style: "destructive", onPress: () => guard(() => removeDefect({ defectId: d._id })) }])}>
                            <MaterialIcons name="delete-outline" size={20} color={colors.defect} />
                          </Pressable>
                        </View>
                      ))}
                      {it.status === "defect" && <Text onPress={() => setSheet({ itemId: it._id, title: it.name, library: it.library })} style={{ color: colors.navy, fontWeight: "600" }}>+ Add another defect</Text>}
                    </>
                  )}
                </Card>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {sheet && <DefectSheet visible itemId={sheet.itemId} title={sheet.title} library={sheet.library} initial={sheet.initial} onClose={() => setSheet(null)} />}

      <Modal visible={!!na} transparent animationType="slide" onRequestClose={() => setNa(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, gap: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={font.section}>Why is this N/A?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {NA_REASONS.map((r) => <Chip key={r} label={r} selected={na?.chosen === r} onPress={() => setNa((n) => n && { ...n, chosen: r })} />)}
            </View>
            {na?.chosen === "Other" && <TextInput placeholder="Reason" value={na.other} onChangeText={(t) => setNa((n) => n && { ...n, other: t })} style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12 }} />}
            <Button label="Save" disabled={na?.chosen === "Other" && !na.other.trim()} onPress={async () => {
              if (!na) return;
              await guard(() => setStatus({ itemId: na.itemId, status: "na", reason: na.chosen === "Other" ? na.other.trim() : na.chosen }));
              setNa(null);
            }} />
            <Button label="Cancel" variant="secondary" onPress={() => setNa(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setMenu(false)}>
          <View style={{ backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Button label="Mark rest of category OK" variant="secondary" onPress={() => {
              setMenu(false);
              const left = items.filter((i) => i.status === "unchecked").length;
              if (!left) return;
              Alert.alert(`Mark the remaining ${left} rows in ${catName} as OK?`, undefined, [{ text: "Cancel" }, { text: "Mark OK", onPress: () => guard(() => markRest({ roomId: rid, categoryNumber: num })) }]);
            }} />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
