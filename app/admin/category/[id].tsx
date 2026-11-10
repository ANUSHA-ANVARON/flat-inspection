import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button, Card, Loading, Screen } from "../../../src/components/ui";
import { useSession } from "../../../src/session";
import { colors, font } from "../../../src/theme";
import { errMsg, toast } from "../../../src/toast";

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = id as Id<"categories">;
  const router = useRouter();
  const { user } = useSession();
  const d = useQuery(api.checklist.categoryDetail, { categoryId });
  const save = useMutation(api.checklist.saveParameter);
  if (!d?.category) return <Screen title="Category"><Loading /></Screen>;
  const c = d.category;
  const sections = [...new Set(d.parameters.map((p) => p.section ?? ""))];
  const sorted = [...d.parameters].sort((a, b) => Number(!a.active) - Number(!b.active) || a.order - b.order);

  const toggle = (p: (typeof d.parameters)[number], active: boolean) =>
    save({ admin: user!.name, parameterId: p._id, categoryId, name: p.name, whatToCheck: p.whatToCheck, checkTypes: p.checkTypes, extraInput: p.extraInput, unit: p.unit, tool: p.tool, section: p.section, roomTypes: p.roomTypes, active })
      .catch((e) => toast(errMsg(e)));

  return (
    <Screen title={c.name}
      right={<Text style={{ color: "#fff" }} onPress={() => router.push({ pathname: "/admin/category-edit", params: { id } })}>Edit</Text>}
      footer={<Button label="+ Add parameter" onPress={() => router.push({ pathname: "/admin/parameter", params: { categoryId: id } })} />}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card style={{ gap: 6 }}>
          <Text style={font.section}>{c.name}</Text>
          <Text style={font.caption}>{c.group} · {d.parameters.length} parameters{c.active ? "" : " · Hidden"}</Text>
          <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
            {["H", "K", "U", "W", "B", "S", "F"].map((r) => (
              <View key={r} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.navy, backgroundColor: c.roomTypes.includes(r as any) ? colors.navy : "#fff" }}>
                <Text style={{ fontSize: 12, color: c.roomTypes.includes(r as any) ? "#fff" : colors.navy }}>{r}</Text>
              </View>
            ))}
          </View>
        </Card>
        {sections.map((sec) => (
          <View key={sec} style={{ gap: 8 }}>
            {sec ? <Text style={[font.caption, { textTransform: "uppercase" }]}>{sec}</Text> : null}
            {sorted.filter((p) => (p.section ?? "") === sec).map((p) => (
              <Pressable key={p._id} onPress={() => router.push({ pathname: "/admin/parameter", params: { categoryId: id, parameterId: p._id } })}>
                <Card style={{ opacity: p.active ? 1 : 0.5, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[font.body, { fontWeight: "700" }]}>{p.ref}  {p.name}{!p.active ? "  · Hidden" : ""}</Text>
                    <Text style={font.caption}>{p.checkTypes.join(" · ")}  |  {p.roomTypes.join(" ")}</Text>
                  </View>
                  <Switch value={p.active} trackColor={{ true: colors.gold }} onValueChange={(v) => { toggle(p, v); }} />
                  <MaterialIcons name="chevron-right" size={22} color={colors.na} />
                </Card>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
