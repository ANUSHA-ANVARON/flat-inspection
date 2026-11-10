import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Loading, Screen } from "../../../src/components/ui";
import { takeAndUpload } from "../../../src/photos";
import { colors, font } from "../../../src/theme";

export default function RoomPhotos() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const rid = roomId as Id<"rooms">;
  const photos = useQuery(api.items.roomPhotos, { roomId: rid });
  const room = useQuery(api.items.roomCategories, { roomId: rid });
  const gen = useMutation(api.items.generateUploadUrl);
  const add = useMutation(api.items.addRoomPhoto);
  const snap = async () => {
    try {
      const shot = await takeAndUpload(gen);
      if (shot) await add({ roomId: rid, storageId: shot.storageId as Id<"_storage"> });
    } catch (e: any) { Alert.alert("Photo", String(e.message ?? e)); }
  };
  return (
    <Screen title={`${room?.room?.name ?? ""} · Photos`}>
      {!photos ? <Loading /> : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={[font.caption, { marginBottom: 8 }]}>{photos.length} photos</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable onPress={snap} style={{ width: "31%", aspectRatio: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.goldTint, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="add-a-photo" size={28} color={colors.navy} />
            </Pressable>
            {photos.map((p) => p.url && <Image key={p._id} source={{ uri: p.url }} style={{ width: "31%", aspectRatio: 1, borderRadius: 8 }} />)}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}
