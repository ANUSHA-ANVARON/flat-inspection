import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../convex/_generated/api";
import { Button, Screen } from "../../src/components/ui";
import { useAdmin } from "../../src/admin";
import { useSession } from "../../src/session";
import { colors, font } from "../../src/theme";

export default function Unlock() {
  const { user } = useSession();
  const { unlock } = useAdmin();
  const router = useRouter();
  const attempt = useMutation(api.checklist.unlock);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [lockedUntil, setLockedUntil] = useState(0);
  const locked = lockedUntil > Date.now();

  const submit = async () => {
    if (!user) return;
    try {
      const r = await attempt({ userId: user._id, password: pw });
      if (r.ok) { unlock(); router.replace("/admin"); return; }
      setPw("");
      if (r.lockedUntil > Date.now()) { setLockedUntil(r.lockedUntil); setMsg("Locked for 15 minutes"); }
      else setMsg(`Wrong password. ${r.attemptsLeft} attempts left.`);
    } catch (e: any) { setMsg(String(e.message ?? e).replace(/^.*Error: /, "")); }
  };

  return (
    <Screen title="Checklist manager" back>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="lock" size={36} color="#fff" />
        </View>
        <Text style={font.title}>Enter admin password</Text>
        <Text style={font.caption}>Only administrators can change the checklist.</Text>
        <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 12, minHeight: 48 }}>
          <TextInput style={{ flex: 1 }} value={pw} onChangeText={setPw} secureTextEntry={!show} editable={!locked} placeholder="Admin password" autoCapitalize="none" />
          <MaterialIcons name={show ? "visibility-off" : "visibility"} size={22} color={colors.na} onPress={() => setShow(!show)} />
        </View>
        {msg ? <Text style={{ color: colors.defect, alignSelf: "flex-start" }}>{msg}</Text> : null}
        <Button label="Unlock" onPress={submit} disabled={!pw || locked} style={{ alignSelf: "stretch" }} />
      </ScrollView>
    </Screen>
  );
}
