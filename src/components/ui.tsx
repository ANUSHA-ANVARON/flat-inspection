import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, radius, tap } from "../theme";

export function Screen({ title, subtitle, right, back = true, children, footer }: {
  title: string; subtitle?: string; right?: React.ReactNode; back?: boolean; children: React.ReactNode; footer?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.navy }}>
        <View style={s.bar}>
          {back && (
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 12 }}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.barTitle} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={s.barSub} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      </SafeAreaView>
      {/* Keeps inputs and the pinned footer above the on-screen keyboard. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
        <View style={{ flex: 1 }}>{children}</View>
        {footer ? <SafeAreaView edges={["bottom"]} style={s.footer}>{footer}</SafeAreaView> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

export function SyncChip({ offline }: { offline?: boolean }) {
  return (
    <View style={s.sync}>
      <MaterialIcons name={offline ? "cloud-off" : "cloud-done"} size={14} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 11 }}>{offline ? "Offline" : "Saved"}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ label, onPress, variant = "primary", disabled, loading, style }: {
  label: string; onPress: () => void; variant?: "primary" | "secondary" | "danger"; disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const bg = variant === "primary" ? colors.gold : colors.surface;
  const fg = variant === "danger" ? colors.defect : colors.navy;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.btn, { backgroundColor: bg, borderColor: variant === "primary" ? colors.gold : variant === "secondary" ? colors.navy : "transparent", opacity: disabled ? 0.45 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={colors.navy} /> : <Text style={[s.btnText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  const c = color ?? colors.gold;
  return (
    <Pressable onPress={onPress} style={[s.chip, selected && { backgroundColor: c, borderColor: c }]}>
      <Text style={{ color: selected ? (color ? "#fff" : colors.navy) : colors.navy, fontSize: 14, fontWeight: selected ? "600" : "400" }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, required, suffix, ...props }: TextInputProps & { label: string; required?: boolean; suffix?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={font.caption}>{label}{required ? <Text style={{ color: colors.defect }}> •</Text> : null}</Text>
      <View style={s.fieldWrap}>
        <TextInput placeholderTextColor={colors.na} {...props} style={[s.field, props.style]} />
        {suffix ? <Text style={font.caption}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: color, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
      <View style={{ width: `${Math.min(100, value)}%`, height: 6, backgroundColor: colors.gold }} />
    </View>
  );
}

export function Loading() {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.navy} /></View>;
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  barTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  barSub: { color: "#C5CEDB", fontSize: 12 },
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: 16, gap: 8 },
  sync: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 16 },
  btn: { height: tap.primary, borderRadius: radius.card, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 16, fontWeight: "600" },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  fieldWrap: { flexDirection: "row", alignItems: "center", minHeight: tap.min, borderRadius: 8, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, marginTop: 4 },
  field: { flex: 1, fontSize: 15, color: colors.navy, paddingVertical: 10 },
});
