import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { tokens } from "@/theme/tokens";

import type { DailyWritingCampaignProgressStep } from "./dailyWritingCampaign";

type DailyWritingCampaignStepperProps = {
  steps: DailyWritingCampaignProgressStep[];
  title?: string;
  style?: StyleProp<ViewStyle>;
};

function getStateLabel(step: DailyWritingCampaignProgressStep) {
  if (step.state === "completed") return "완료";
  if (step.state === "current") return "오늘";
  return "다음";
}

function getConnectorActive(previousStep: DailyWritingCampaignProgressStep | undefined) {
  return previousStep?.state === "completed";
}

export function DailyWritingCampaignStepper({
  steps,
  title,
  style,
}: DailyWritingCampaignStepperProps) {
  if (steps.length === 0) return null;

  return (
    <View style={[styles.container, style]} accessibilityLabel="글숲 한달 글쓰기 프로젝트 진행 단계">
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.rail}>
        {steps.map((step, index) => {
          const isCompleted = step.state === "completed";
          const isCurrent = step.state === "current";
          const previousStep = steps[index - 1];

          return (
            <React.Fragment key={step.key}>
              {index > 0 ? (
                <View
                  style={[
                    styles.connector,
                    getConnectorActive(previousStep) && styles.connectorActive,
                  ]}
                />
              ) : null}
              <View style={styles.step}>
                <Text
                  style={[
                    styles.stateLabel,
                    isCompleted && styles.stateLabelCompleted,
                    isCurrent && styles.stateLabelCurrent,
                  ]}
                  numberOfLines={1}
                >
                  {getStateLabel(step)}
                </Text>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isCurrent && styles.circleCurrent,
                  ]}
                >
                  <Text
                    style={[
                      styles.circleText,
                      (isCompleted || isCurrent) && styles.circleTextActive,
                      isCompleted && styles.circleTextCompleted,
                    ]}
                  >
                    {isCompleted ? "✓" : step.day}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    isCurrent && styles.dayLabelCurrent,
                  ]}
                  numberOfLines={1}
                >
                  {step.day}일차
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  title: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  rail: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  step: {
    width: 58,
    alignItems: "center",
    gap: 5,
  },
  connector: {
    flex: 1,
    height: 4,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.borderStrong,
    marginTop: 35,
    marginHorizontal: -1,
  },
  connectorActive: {
    backgroundColor: tokens.colors.green700,
  },
  stateLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: tokens.colors.textFaint,
  },
  stateLabelCompleted: {
    color: tokens.colors.green700,
  },
  stateLabelCurrent: {
    color: tokens.colors.green900,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  circleCompleted: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green700,
  },
  circleCurrent: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green050,
  },
  circleText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.textFaint,
  },
  circleTextActive: {
    color: tokens.colors.green700,
  },
  circleTextCompleted: {
    color: tokens.colors.textInverse,
  },
  dayLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  dayLabelCurrent: {
    color: tokens.colors.green700,
  },
});
