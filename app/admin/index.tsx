import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { useAdmin } from "../../src/admin";
import { Card, Loading, Screen } from "../../src/components/ui";
import { useSession } from "../../src/session";
import { errMsg, toast } from "../../src/toast";
import { colors, font } from "../../src/theme";

export default function ManagerHome() {
  const router = useRouter();
  const { user } = useSession();
  const { lock } = useAdmin();
  const data = useQuery(api.checklist.overview);
  const setActive = useMutation(api.checklist.setCategoryActive);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  if (!data) return <Screen title="Checklist manager"><Loading /></Screen>;

  const cats = data.categories.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(cats.map((c) => c.group))];
  const when = data.meta ? new Date(data.meta.lastChangedAt).toLocaleDateString() : "";

  return (
    <Screen title="Checklist manager" back={false}
      right={<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ fontSize: 11, fontWeight: "700", color: colors.navy }}>Admin</Text></View>
        <Pressable onPress={() => { lock(); router.replace("/settings"); }}><MaterialIcons name="lock" size={22} color="#fff" /></Pressable>
        <Pressable onPress={() => setMenu(true)}><MaterialIcons name="more-vert" size={22} color="#fff" /></Pressable>
      </View>}>
      <View style={{ backgroundColor: colors.border, padding: 8, paddingHorizontal: 16 }}>
        <Text style={font.caption}>Checklist version {data.meta?.version} · Last changed {when} by {data.meta?.lastChangedBy}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
        <TextInput value={q} onChangeText={setQ} placeholder="Search categories" placeholderTextColor={colors.na}
          style={{ minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", paddingHorizontal: 12 }} />
        {groups.map((g) => (
          <View key={g} style={{ gap: 8 }}>
            <Text style={[font.caption, { textTransform: "uppercase" }]}>{g}</Text>
            {cats.filter((c) => c.group === g).map((c) => (
              <Pressable key={c._id} onPress={() => router.push({ pathname: "/admin/category/[id]", params: { id: c._id } })}>
                <Card style={{ opacity: c.active ? 1 : 0.5, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[font.body, { fontWeight: "700" }]}>{c.number}. {c.name}{!c.active ? "  · Hidden" : ""}</Text>
                      <Text style={font.caption}>{c.parameterCount} parameters</Text>
                    </View>
                    <Switch value={c.active} trackColor={{ true: colors.gold }} onValueChange={(v) => setActive({ admin: user!.name, categoryId: c._id, active: v }).then(() => toast(v ? "Category shown" : "Category hidden")).catch((e) => toast(errMsg(e)))} />
                    <MaterialIcons name="chevron-right" size={22} color={colors.na} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {["H", "K", "U", "W", "B", "S", "F"].map((r) => (
                      <View key={r} style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: c.roomTypes.includes(r as any) ? colors.navy : colors.bg }}>
                        <Text style={{ fontSize: 10, color: c.roomTypes.includes(r as any) ? "#fff" : colors.na }}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
      <Pressable onPress={() => router.push("/admin/category-edit")}
        style={{ position: "absolute", right: 16, bottom: 24, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 20, height: 52, elevation: 4 }}>
        <MaterialIcons name="add" size={22} color={colors.navy} /><Text style={{ fontWeight: "700", color: colors.navy }}>Add category</Text>
      </Pressable>
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }} onPress={() => setMenu(false)}>
          <View style={{ position: "absolute", top: 90, right: 16, backgroundColor: "#fff", borderRadius: 8, padding: 4, elevation: 6, minWidth: 180 }}>
            <Text style={{ padding: 14, color: colors.navy }} onPress={() => { setMenu(false); router.push("/admin/versions"); }}>Version history</Text>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
