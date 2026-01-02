import React from "react";
import { ScrollView, View } from "react-native";
import { Preview_RectBar_RaisedFab } from "../src/ui-kit/TabBarPreviews"; // ✅ 상대경로 기준

export default function UiKit() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F6F6F4" }}>
      <View style={{ height: 640 }}>
        <Preview_RectBar_RaisedFab />
      </View>
    </ScrollView>
  );
}
