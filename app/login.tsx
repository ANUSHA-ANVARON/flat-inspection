import { useMutation } from "convex/react";
import React, { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";
import { Button, Card, Field } from "../src/components/ui";
import { useSession } from "../src/session";
import { colors } from "../src/theme";

export default function Login() {
  const login = useMutation(api.users.login);
  const { signIn } = useSession();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setError("");
    try { await signIn(await login({ phone: phone.trim(), code })); }
    catch (e: any) { setError(String(e.message ?? e).replace(/^.*Error: /, "")); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.navy, padding: 16 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: 24 }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700" }}>Flat Inspection</Text>
          <Text style={{ color: "#C5CEDB" }}>Pre-handover inspection</Text>
        </View>
        <Card>
          <Field label="Mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" />
          <Field label="Verification code" keyboardType="number-pad" value={code} onChangeText={setCode} placeholder="6-digit code" secureTextEntry />
          {error ? <Text style={{ color: colors.defect, marginBottom: 12 }}>{error}</Text> : null}
          <Button label="Verify & Sign in" onPress={submit} loading={busy} disabled={!phone || code.length < 4} />
        </Card>
      </ScrollView></KeyboardAvoidingView>
      <Text style={{ color: "#8A94A6", textAlign: "center", fontSize: 12 }}>INTERNAL USE ONLY</Text>
    </SafeAreaView>
  );
}
