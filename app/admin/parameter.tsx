import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button, Card, Chip, Field, Screen } from "../../src/components/ui";
import { useSession } from "../../src/session";
import { colors, font, severityColor } from "../../src/theme";
import { errMsg, savedToast, toast } from "../../src/toast";
import { ROOM_TYPES } from "./category-edit";

const CHECK_TYPES = ["Visual", "Measure", "Test", "Operate", "Verify", "Record"];
const autoInput = (t: string[]) => (t.includes("Measure") || t.includes("Test") ? "number" : t.includes("Verify") ? "text" : "none");
type Sev = "critical" | "major" | "minor";

export default function Parameter() {
  const { categoryId: cid, parameterId: pid } = useLocalSearchParams<{ categoryId: string; parameterId?: string }>();
  const categoryId = cid as Id<"categories">;
  const parameterId = pid as Id<"parameters"> | undefined;
  const router = useRouter();
  const { user } = useSession();
  const cat = useQuery(api.checklist.categoryDetail, { categoryId });
  const existing = useQuery(api.checklist.parameterDetail, parameterId ? { parameterId } : "skip");
  const save = useMutation(api.checklist.saveParameter);
  const remove = useMutation(api.checklist.removeParameter);
  const saveDefect = useMutation(api.checklist.saveDefectType);
  const removeDefect = useMutation(api.checklist.removeDefectType);

  const [name, setName] = useState("");
  const [what, setWhat] = useState("");
  const [types, setTypes] = useState<string[]>(["Visual"]);
  const [extra, setExtra] = useState<"none" | "number" | "text">("none");
  const [extraTouched, setExtraTouched] = useState(false);
  const [unit, setUnit] = useState("");
  const [tool, setTool] = useState("");
  const [section, setSection] = useState("");
  const [rooms, setRooms] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [sheet, setSheet] = useState<null | { id?: Id<"defectTypes">; name: string; severity: Sev; photoRequired: boolean }>(null);
  const [many, setMany] = useState<string | null>(null);

  useEffect(() => { if (!parameterId && cat?.category) setRooms(cat.category.roomTypes); }, [cat?.category?._id]);
  useEffect(() => {
    const p = existing?.parameter;
    if (!p) return;
    setName(p.name); setWhat(p.whatToCheck); setTypes(p.checkTypes); setExtra(p.extraInput); setExtraTouched(true);
    setUnit(p.unit); setTool(p.tool); setSection(p.section ?? ""); setRooms(p.roomTypes); setActive(p.active);
  }, [existing?.parameter?._id]);

  const toggleType = (t: string) => {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    setTypes(next);
    if (!extraTouched) setExtra(autoInput(next));
  };
  const dup = (cat?.parameters ?? []).some((p) => p.name.toLowerCase() === name.trim().toLowerCase() && p._id !== parameterId);
  const defects = existing?.defectTypes ?? [];

  const submit = async (another: boolean) => {
    try {
      const r = await save({ admin: user!.name, parameterId, categoryId, name: name.trim(), whatToCheck: what, checkTypes: types, extraInput: extra, unit, tool, section: section || undefined, roomTypes: rooms as any, active });
      savedToast(r.version);
      if (another) { setName(""); setWhat(""); if (parameterId) router.replace({ pathname: "/admin/parameter", params: { categoryId: cid } }); }
      else router.back();
    } catch (e: any) { Alert.alert("Not saved", errMsg(e)); }
  };
  const del = () => Alert.alert(
    (existing?.usage ?? 0) > 0 ? "Hide this parameter?" : "Delete this parameter permanently?",
    (existing?.usage ?? 0) > 0 ? `This parameter was used in ${existing!.usage} inspection rows. It can't be deleted, only hidden. Hidden parameters stop appearing in new inspections and old reports keep them.` : "It has never been used.",
    [{ text: "Cancel" }, { text: (existing?.usage ?? 0) > 0 ? "Hide" : "Delete", style: (existing?.usage ?? 0) > 0 ? "default" : "destructive", onPress: async () => { await remove({ admin: user!.name, parameterId: parameterId! }); router.back(); } }]);

  const saveSheet = async () => {
    if (!sheet || !sheet.name.trim() || !parameterId) return;
    await saveDefect({ admin: user!.name, parameterId, defectTypeId: sheet.id, name: sheet.name.trim(), severity: sheet.severity, photoRequired: sheet.photoRequired, active: true });
    setSheet(null);
  };
  const saveMany = async () => {
    if (many === null || !parameterId || !sheet) return;
    for (const line of many.split("\n").map((s) => s.trim()).filter(Boolean))
      await saveDefect({ admin: user!.name, parameterId, name: line, severity: sheet.severity, photoRequired: true, active: true });
    setMany(null); setSheet(null); toast("Defect types added");
  };

  const sections = [...new Set((cat?.parameters ?? []).map((p) => p.section).filter(Boolean))] as string[];

  return (
    <Screen title={parameterId ? "Edit parameter" : "New parameter"} subtitle={cat?.category?.name}
      footer={<><Button label="Save parameter" disabled={!name.trim() || rooms.length === 0 || dup || types.length === 0} onPress={() => submit(false)} />
        <Button label="Save and add another" variant="secondary" disabled={!name.trim() || rooms.length === 0 || dup || types.length === 0} onPress={() => submit(true)} /></>}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          {sections.length > 0 && <>
            <Text style={font.caption}>Section (optional)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }}>
              <Chip label="None" selected={!section} onPress={() => setSection("")} />
              {sections.map((s) => <Chip key={s} label={s} selected={section === s} onPress={() => setSection(s)} />)}
            </View>
          </>}
          <Field label="Parameter name" required value={name} onChangeText={setName} placeholder="Hollowness" />
          {dup && <Text style={{ color: colors.defect, marginBottom: 8 }}>A parameter with this name already exists.</Text>}
          <Field label="What to check" multiline value={what} onChangeText={setWhat} style={{ minHeight: 80, textAlignVertical: "top" }} />
          <Field label="Tool or method (optional)" value={tool} onChangeText={setTool} />
        </Card>
        <Card>
          <Text style={font.section}>Check type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }}>{CHECK_TYPES.map((t) => <Chip key={t} label={t} selected={types.includes(t)} onPress={() => toggleType(t)} />)}</View>
          <Text style={font.section}>Extra input</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {(["none", "number", "text"] as const).map((e) => <Chip key={e} label={e[0].toUpperCase() + e.slice(1)} selected={extra === e} onPress={() => { setExtra(e); setExtraTouched(true); }} />)}
          </View>
          {extra === "number" && <View style={{ marginTop: 12 }}><Field label="Unit" value={unit} onChangeText={setUnit} placeholder="ft, sq ft, mm" /></View>}
        </Card>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={font.section}>Applies to room types</Text>
            <Text style={{ color: colors.navy, textDecorationLine: "underline" }} onPress={() => setRooms(ROOM_TYPES.map((r) => r[0]))}>Select all</Text>
          </View>
          <Text style={[font.caption, { marginBottom: 8 }]}>This row appears only in these rooms.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ROOM_TYPES.map(([c, l]) => <Chip key={c} label={l} selected={rooms.includes(c)} onPress={() => setRooms((r) => (r.includes(c) ? r.filter((x) => x !== c) : [...r, c]))} />)}
          </View>
        </Card>
        <Card>
          <Text style={font.section}>Defect types</Text>
          {!parameterId ? <Text style={[font.caption, { marginTop: 8 }]}>Save the parameter first, then add defect types.</Text> : (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {defects.map((d) => (
                  <Chip key={d._id} label={`● ${d.name}`} onPress={() => setSheet({ id: d._id, name: d.name, severity: d.severity, photoRequired: d.photoRequired })} />
                ))}
                <Chip label="+ Add defect type" onPress={() => setSheet({ name: "", severity: "major", photoRequired: true })} />
              </View>
              {defects.length === 0 && <Text style={{ color: colors.major, marginTop: 8, fontSize: 12 }}>Inspectors will only see ‘Other’.</Text>}
            </>
          )}
        </Card>
        <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={font.body}>Active</Text><Switch value={active} onValueChange={setActive} trackColor={{ true: colors.gold }} />
        </Card>
        <Card style={{ gap: 8 }}>
          <Text style={font.caption}>How inspectors will see it</Text>
          <Text style={[font.body, { fontWeight: "700" }]}>{name || "Parameter name"}</Text>
          <Text style={font.caption} numberOfLines={1}>{what || "What to check"}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["OK", "Defect", "N/A"].map((l) => <View key={l} style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.navy, fontWeight: "600" }}>{l}</Text></View>)}
          </View>
        </Card>
        {parameterId && <Text onPress={del} style={{ color: colors.defect, textAlign: "center", padding: 12 }}>{(existing?.usage ?? 0) > 0 ? "Hide parameter" : "Delete parameter"}</Text>}
      </ScrollView>

      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => { setSheet(null); setMany(null); }}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, gap: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={font.section}>{sheet?.id ? "Edit defect type" : "Add defect type"}</Text>
            {many === null ? (
              <Field label="Defect name" value={sheet?.name ?? ""} onChangeText={(t) => setSheet((s) => s && { ...s, name: t })} placeholder="Hollow tile" />
            ) : (
              <TextInput multiline value={many} onChangeText={setMany} placeholder="One defect per line" style={{ minHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, textAlignVertical: "top" }} />
            )}
            <Text style={font.caption}>Default severity</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["critical", "major", "minor"] as const).map((s) => <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} color={severityColor[s]} selected={sheet?.severity === s} onPress={() => setSheet((x) => x && { ...x, severity: s })} />)}
            </View>
            {many === null && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={font.body}>Photo required</Text>
                <Switch value={sheet?.photoRequired ?? true} trackColor={{ true: colors.gold }} onValueChange={(v) => setSheet((s) => s && { ...s, photoRequired: v })} />
              </View>
            )}
            <Button label="Save" onPress={many === null ? saveSheet : saveMany} />
            {many === null && sheet?.id && <Text style={{ color: colors.defect, textAlign: "center" }} onPress={async () => { await removeDefect({ admin: user!.name, defectTypeId: sheet.id! }); setSheet(null); }}>Remove</Text>}
            {many === null && !sheet?.id && <Text style={{ color: colors.navy, textAlign: "center", textDecorationLine: "underline" }} onPress={() => setMany("")}>Add many at once</Text>}
            <Text style={{ color: colors.navy, textAlign: "center" }} onPress={() => { setSheet(null); setMany(null); }}>Cancel</Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
