import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@/theme/tokens";
import { typography } from "@/theme/typography";

type Props = {
  title: string;
  titleVariant?: "brand" | "page";
  subtitle?: string;
  actions?: React.ReactNode;
};

export function FolioHeader({
  title,
  titleVariant = "page",
  subtitle,
  actions,
}: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.copy}>
          <Text style={titleVariant === "brand" ? styles.brandTitle : styles.title}>{title}</Text>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.divider,
  },
  titleRow: {
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
  brandTitle: {
    ...typography.brand,
    color: tokens.colors.green900,
  },
  subtitle: {
    ...typography.meta,
    marginTop: 1,
    color: tokens.colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
});
