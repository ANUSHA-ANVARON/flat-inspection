import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import React, { useEffect, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { takeAndUpload } from "../photos";
import { colors, font, severityColor } from "../theme";
import { Button, Chip } from "./ui";

type Sev = "critical" | "major" | "minor";
export type DefectDraft = { defectId?: Id<"defects">; type: string; severity: Sev; location?: string; note?: string; photoIds: Id<"_storage">[] };

export function DefectSheet({ visible, itemId, title, library, initial, onClose }: {
  visible: boolean; itemId: Id<"items">; title: string;
  library: { name: string; severity: Sev; photoRequired: boolean }[];
  initial?: DefectDraft; onClose: () => void;
}) {
  const save = useMutation(api.items.saveDefect);
  const gen = useMutation(api.items.generateUploadUrl);
  const [type, setType] = useState("");
  const [other, setOther] = useState("");
  const [severity, setSeverity] = useState<Sev>("major");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [photoIds, setPhotoIds] = useState<Id<"_storage">[]>([]);
  const [uris, setUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = (d?: DefectDraft) => {
    const known = d && library.some((l) => l.name === d.type);
    setType(d ? (known ? d.type : "Other") : "");
    setOther(d && !known ? d.type : "");
    setSeverity(d?.severity ?? "major"); setLocation(d?.location ?? ""); setNote(d?.note ?? "");
    setPhotoIds(d?.photoIds ?? []); setUris([]);
  };
  useEffect(() => { if (visible) reset(initial); }, [visible, initial]);

  const finalType = type === "Other" ? other.trim() : type;
  const canSave = finalType.length > 0 && photoIds.length > 0;

  const pick = (name: string) => {
    setType(name);
    const l = library.find((x) => x.name === name);
    if (l) setSeverity(l.severity);
  };
  const snap = async () => {
    try {
      const shot = await takeAndUpload(gen);
      if (shot) { setPhotoIds((p) => [...p, shot.storageId as Id<"_storage">]); setUris((u) => [...u, shot.uri]); }
    } catch (e: any) { Alert.alert("Photo", String(e.message ?? e)); }
  };
  const submit = async (another: boolean) => {
    setBusy(true);
    try {
      await save({ itemId, defectId: initial?.defectId, type: finalType, severity, location: location || undefined, note: note || undefined, photoIds });
      if (another) reset(); else onClose();
    } catch (e: any) { Alert.alert("Could not save", String(e.message ?? e)); }
    finally { setBusy(false); }
  };
  const close = () => {
    if (!finalType && photoIds.length === 0) return onClose();
    Alert.alert("Discard this defect?", undefined, [{ text: "Keep editing" }, { text: "Discard", style: "destructive", onPress: onClose }]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View style={{ height: "85%", backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={font.title}>{title}</Text>
            <Pressable onPress={close} hitSlop={12}><MaterialIcons name="close" size={24} color={colors.navy} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 12 }} keyboardShouldPersistTaps="handled">
            <Text style={font.caption}>Defect type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[...library.map((l) => l.name), "Missing", "Other"].filter((n, i, a) => a.indexOf(n) === i).map((n) => <Chip key={n} label={n} selected={type === n} onPress={() => pick(n)} />)}
            </View>
            {type === "Other" && <TextInput value={other} onChangeText={setOther} placeholder="Describe the defect" style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12 }} />}
            <Text style={font.caption}>Severity</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["critical", "major", "minor"] as const).map((s) => <Chip key={s} label={s[0].toUpperCase() + s.slice(1)} selected={severity === s} color={severityColor[s]} onPress={() => setSeverity(s)} />)}
            </View>
            <Text style={font.caption}>Location detail (optional)</Text>
            <TextInput value={location} onChangeText={setLocation} placeholder="near window, north wall" style={{ minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12 }} />
            <Text style={font.caption}>Note (optional)</Text>
            <TextInput value={note} onChangeText={setNote} multiline style={{ minHeight: 80, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, textAlignVertical: "top" }} />
            <Text style={font.caption}>Photos</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Pressable onPress={snap} style={{ width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.goldTint, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="add-a-photo" size={26} color={colors.navy} />
              </Pressable>
              {uris.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 72, height: 72, borderRadius: 8 }} />)}
              {photoIds.length > uris.length && <Text style={font.caption}>+{photoIds.length - uris.length} saved</Text>}
            </View>
            {photoIds.length === 0 && <Text style={{ color: colors.defect, fontSize: 12 }}>Add at least 1 photo</Text>}
          </ScrollView>
          <View style={{ gap: 8 }}>
            <Button label="Save defect" disabled={!canSave} loading={busy} onPress={() => submit(false)} />
            {!initial && <Button label="Save and add another" variant="secondary" disabled={!canSave || busy} onPress={() => submit(true)} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}
