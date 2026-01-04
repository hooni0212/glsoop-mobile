import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, View } from "react-native";

import { WriteActionBar } from "@/components/write/WriteActionBar";
import { WriteEditor } from "@/components/write/WriteEditor";
import { WriteMetaSection } from "@/components/write/WriteMetaSection";
import { WriteStates } from "@/components/write/WriteStates";
import { WriteTopBar } from "@/components/write/WriteTopBar";

import { createWriteStyles } from "./Write.styles";

export default function Write() {
  const styles = useMemo(() => createWriteStyles(), []);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const canSubmit = title.trim().length > 0 || body.trim().length > 0;

  const onPressClose = () => router.back();

  const onPressSubmit = () => {
    // ✅ 기존 동작 유지 (임시 로그 → back)
    console.log("[WRITE] submit", { title, body });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <WriteTopBar
          title="글쓰기"
          canSubmit={canSubmit}
          onPressClose={onPressClose}
          onPressSubmit={onPressSubmit}
          styles={styles}
        />

        {/* ✅ 이번 패치에서는 States 로직 건드리지 않음 (DoD 컴포넌트만 존재시키기) */}
        <WriteStates kind="idle" styles={styles} />

        <View style={styles.container}>
          <WriteEditor
            title={title}
            body={body}
            onChangeTitle={setTitle}
            onChangeBody={setBody}
            styles={styles}
          />

          <WriteMetaSection styles={styles} />
        </View>

        {/* ✅ 이번 패치에서는 UI 변화 없이 null 유지 가능 */}
        <WriteActionBar styles={styles} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
