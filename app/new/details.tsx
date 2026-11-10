import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, Chip, Field, Screen } from "../../src/components/ui";
import { useDraft } from "../../src/draft";
import { useSession } from "../../src/session";
import { font } from "../../src/theme";

export default function Details() {
  const { draft: d, set } = useDraft();
  const { user } = useSession();
  const router = useRouter();
  const ok = d.customerName.trim() && d.customerPhone.trim() && d.project.trim() && d.flatNumber.trim();
  return (
    <Screen title="New inspection" subtitle="Step 1 of 2 · Details" footer={<Button label="Next" disabled={!ok} onPress={() => router.push("/new/areas")} />}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={font.section}>Customer</Text>
          <View style={{ height: 8 }} />
          <Field label="Name" required value={d.customerName} onChangeText={(v) => set({ customerName: v })} />
          <Field label="Phone" required keyboardType="phone-pad" value={d.customerPhone} onChangeText={(v) => set({ customerPhone: v })} />
          <Field label="Email" keyboardType="email-address" autoCapitalize="none" value={d.customerEmail} onChangeText={(v) => set({ customerEmail: v })} />
        </Card>
        <Card>
          <Text style={font.section}>Property</Text>
          <View style={{ height: 8 }} />
          <Field label="Project name" required value={d.project} onChangeText={(v) => set({ project: v })} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Tower" value={d.tower} onChangeText={(v) => set({ tower: v })} /></View>
            <View style={{ flex: 1 }}><Field label="Flat number" required value={d.flatNumber} onChangeText={(v) => set({ flatNumber: v })} /></View>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="Floor" value={d.floor} onChangeText={(v) => set({ floor: v })} /></View>
            <View style={{ flex: 1 }}><Field label="Builder" value={d.builder} onChangeText={(v) => set({ builder: v })} /></View>
          </View>
        </Card>
        <Card>
          <Text style={font.section}>Flat type</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villament", "Other"].map((t) => <Chip key={t} label={t} selected={d.flatType === t} onPress={() => set({ flatType: t })} />)}
          </View>
        </Card>
        <Card>
          <Text style={font.section}>Service</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {["Inspection", "Re-inspection", "Dampness"].map((t) => <Chip key={t} label={t} selected={d.service === t} onPress={() => set({ service: t })} />)}
          </View>
        </Card>
        <Card>
          <Text style={font.section}>Schedule & inspector</Text>
          <Text style={[font.body, { marginTop: 8 }]}>{new Date(d.scheduledAt).toLocaleString()}</Text>
          <Text style={font.caption}>Inspector: {user?.name}</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
