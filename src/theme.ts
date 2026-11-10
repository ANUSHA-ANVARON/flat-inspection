// Design tokens from the spec (Master Category Reference, design system block).
export const colors = {
  navy: "#0B1F3A",
  gold: "#C9A227",
  goldTint: "#F6EFD6",
  bg: "#F6F7F9",
  surface: "#FFFFFF",
  border: "#E2E6EC",
  textSecondary: "#5B6B80",
  ok: "#1E8E5A",
  defect: "#C8372D",
  na: "#8A94A6",
  major: "#E07B1A",
  minor: "#3B6FB6",
  critical: "#C8372D",
};

export const severityColor = { critical: colors.critical, major: colors.major, minor: colors.minor } as const;

export const space = { page: 16, unit: 8 };
export const radius = { card: 12, pill: 999 };
export const tap = { min: 48, primary: 52 };

export const font = {
  title: { fontSize: 22, fontWeight: "700" as const, color: colors.navy },
  section: { fontSize: 16, fontWeight: "600" as const, color: colors.navy },
  body: { fontSize: 15, color: colors.navy },
  caption: { fontSize: 12, color: colors.textSecondary },
  tabular: { fontVariant: ["tabular-nums" as const] },
};
