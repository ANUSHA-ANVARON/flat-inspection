import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button, Card, Chip, Field, Screen } from "../../src/components/ui";
import { useSession } from "../../src/session";
import { colors, font } from "../../src/theme";
import { errMsg, savedToast } from "../../src/toast";

export const ROOM_TYPES = [["H", "Habitable"], ["K", "Kitchen"], ["U", "Utility"], ["W", "Washroom"], ["B", "Balcony"], ["S", "Support space"], ["F", "Flat-level"]] as const;

export default function CategoryEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const categoryId = id as Id<"categories"> | undefined;
  const router = useRouter();
  const { user } = useSession();
  const existing = useQuery(api.checklist.categoryDetail, categoryId ? { categoryId } : "skip");
  const usage = useQuery(api.checklist.categoryUsage, categoryId ? { categoryId } : "skip");
  const groups = useQuery(api.checklist.groups) ?? [];
  const save = useMutation(api.checklist.saveCategory);
  const remove = useMutation(api.checklist.removeCategory);

  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [newGroup, setNewGroup] = useState(false);
  const [appliesTo, setAppliesTo] = useState("");
  const [findings, setFindings] = useState("");
  const [rooms, setRooms] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const c = existing?.category;
    if (!c) return;
    setName(c.name); setGroup(c.group); setAppliesTo(c.appliesTo); setFindings(c.commonFindings.join("\n")); setRooms(c.roomTypes); setActive(c.active);
  }, [existing?.category?._id]);

  const submit = async () => {
    try {
      const v = await save({ admin: user!.name, categoryId, name, group: group.trim() || "Other", appliesTo, commonFindings: findings.split("\n").map((s) => s.trim()).filter(Boolean), roomTypes: rooms as any, active });
      savedToast(v!); router.back();
    } catch (e: any) { Alert.alert("Not saved", errMsg(e)); }
  };
  const del = () => {
    const used = usage?.used;
    Alert.alert(used ? "Hide category?" : "Delete this category permanently?",
      used ? `This category was used in past inspections. It can't be deleted, only hidden. This will also affect ${usage?.parameterCount} parameters.` : `It has never been used. This will also delete ${usage?.parameterCount} parameters.`,
      [{ text: "Cancel" }, { text: used ? "Hide" : "Delete", style: used ? "default" : "destructive", onPress: async () => { await remove({ admin: user!.name, categoryId: categoryId! }); router.dismissTo("/admin"); } }]);
  };

  return (
    <Screen title={categoryId ? "Edit category" : "New category"}
      footer={<><Button label="Save category" disabled={!name.trim() || rooms.length === 0} onPress={submit} /><Button label="Cancel" variant="secondary" onPress={() => router.back()} /></>}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label="Category name" required value={name} onChangeText={setName} />
          <Text style={font.caption}>Group</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }}>
            {groups.map((g) => <Chip key={g} label={g} selected={group === g && !newGroup} onPress={() => { setGroup(g); setNewGroup(false); }} />)}
            <Chip label="+ New group" selected={newGroup} onPress={() => { setNewGroup(true); setGroup(""); }} />
          </View>
          {newGroup && <Field label="New group name" value={group} onChangeText={setGroup} />}
          <Field label="Applies to (optional)" value={appliesTo} onChangeText={setAppliesTo} />
        </Card>
        <Card>
          <Text style={font.section}>Room types this category applies to</Text>
          <Text style={[font.caption, { marginBottom: 8 }]}>New parameters in this category start with these selected.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ROOM_TYPES.map(([c, l]) => <Chip key={c} label={l} selected={rooms.includes(c)} onPress={() => setRooms((r) => (r.includes(c) ? r.filter((x) => x !== c) : [...r, c]))} />)}
          </View>
        </Card>
        <Card>
          <Field label="Common findings (optional, one per line)" multiline value={findings} onChangeText={setFindings} style={{ minHeight: 80, textAlignVertical: "top" }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View><Text style={font.body}>Active</Text><Text style={font.caption}>Visible in new inspections</Text></View>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.gold }} />
          </View>
        </Card>
        {categoryId && <Text onPress={del} style={{ color: colors.defect, textAlign: "center", padding: 12 }}>{usage?.used ? "Hide category" : "Delete category"}</Text>}
      </ScrollView>
    </Screen>
  );
}
