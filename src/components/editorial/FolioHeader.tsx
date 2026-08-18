import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@/theme/tokens";
import { typography } from "@/theme/typography";

type Props = {
  folio: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function FolioHeader({ folio, eyebrow, title, subtitle, actions }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.indexRow}>
        <Text style={styles.folio}>{folio}</Text>
        <View style={styles.rule} accessibilityElementsHidden />
        <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.divider,
  },
  indexRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  folio: {
    ...typography.meta,
    minWidth: 22,
    color: tokens.colors.green700,
  },
  rule: {
    width: 28,
    height: 1,
    marginHorizontal: 8,
    backgroundColor: tokens.colors.green700,
  },
  eyebrow: {
    ...typography.eyebrow,
    flex: 1,
    color: tokens.colors.textMuted,
  },
  titleRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.pageTitle,
    color: tokens.colors.green900,
  },
  subtitle: {
    ...typography.eyebrow,
    marginTop: 2,
    color: tokens.colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
});
