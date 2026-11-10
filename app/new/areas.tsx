import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, Field, Screen } from "../../src/components/ui";
import { useDraft } from "../../src/draft";
import { colors, font } from "../../src/theme";

export default function Areas() {
  const { draft: d, set } = useDraft();
  const router = useRouter();
  const num = (k: "agreedCarpet" | "agreedSuperBuiltUp" | "agreedBalcony" | "agreedUtility") => (v: string) => set({ [k]: v.replace(/[^0-9.]/g, "") });
  return (
    <Screen title="Agreed areas" subtitle="Step 2 of 2"
      footer={<><Button label="Next: set up rooms" onPress={() => router.push("/new/rooms")} />
        <Text onPress={() => { set({ agreedCarpet: "", agreedSuperBuiltUp: "", agreedBalcony: "", agreedUtility: "" }); router.push("/new/rooms"); }} style={{ textAlign: "center", color: colors.navy, padding: 8 }}>Skip for now</Text></>}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={font.caption}>From the sale agreement. You can skip and add later.</Text>
        <Card>
          <Field label="Carpet area" suffix="sq ft" keyboardType="decimal-pad" value={d.agreedCarpet} onChangeText={num("agreedCarpet")} />
          <Field label="Super built-up area" suffix="sq ft" keyboardType="decimal-pad" value={d.agreedSuperBuiltUp} onChangeText={num("agreedSuperBuiltUp")} />
          <Field label="Balcony area" suffix="sq ft" keyboardType="decimal-pad" value={d.agreedBalcony} onChangeText={num("agreedBalcony")} />
          <Field label="Utility area" suffix="sq ft" keyboardType="decimal-pad" value={d.agreedUtility} onChangeText={num("agreedUtility")} />
        </Card>
        <View />
      </ScrollView>
    </Screen>
  );
}
