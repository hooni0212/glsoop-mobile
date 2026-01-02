import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Write() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const canSubmit = title.trim().length > 0 || body.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* 상단바 */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Ionicons name="close" size={22} color="#2B2B2B" />
          </Pressable>

          <Text style={styles.title}>글쓰기</Text>

          <Pressable
            onPress={() => {
              // TODO: 저장/업로드 연결
              console.log("[WRITE] submit", { title, body });
              router.back();
            }}
            disabled={!canSubmit}
            hitSlop={12}
            style={[styles.doneBtn, !canSubmit && styles.doneBtnDisabled]}
          >
            <Text style={[styles.doneText, !canSubmit && styles.doneTextDisabled]}>
              완료
            </Text>
          </Pressable>
        </View>

        {/* 본문 */}
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.label}>제목</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력해줘"
              placeholderTextColor="#9AA0A6"
              style={styles.inputTitle}
              returnKeyType="next"
            />

            <View style={styles.divider} />

            <Text style={styles.label}>내용</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="오늘의 글을 남겨줘…"
              placeholderTextColor="#9AA0A6"
              style={styles.inputBody}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* 아래 힌트 영역(선택) */}
          <Text style={styles.hint}>
            임시 화면이야. 나중에 카테고리/태그/공개설정/저장 로직 붙이면 됨.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  safe: {
    flex: 1,
    backgroundColor: "#F6F6F4",
  },

  topBar: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#F6F6F4",
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: "#2B2B2B",
  },

  doneBtn: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E5A3D",
  },
  doneBtnDisabled: {
    backgroundColor: "rgba(46,90,61,0.25)",
  },
  doneText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: -0.2,
  },
  doneTextDisabled: {
    color: "rgba(255,255,255,0.9)",
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6C6C6C",
    marginBottom: 8,
    letterSpacing: -0.2,
  },

  inputTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2B2B2B",
    paddingVertical: 6,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 12,
  },

  inputBody: {
    minHeight: 220,
    fontSize: 14,
    lineHeight: 20,
    color: "#2B2B2B",
    paddingVertical: 6,
  },

  hint: {
    marginTop: 10,
    fontSize: 12,
    color: "#8B8B8B",
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
