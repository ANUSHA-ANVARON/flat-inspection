import * as ImagePicker from "expo-image-picker";

type Upload = () => Promise<string>;

/** Take a photo with the camera and upload it to Convex storage. Returns { storageId, uri }, or null if cancelled. */
export async function takeAndUpload(generateUploadUrl: Upload) {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error("Camera permission is needed to take photos");
  const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  if (res.canceled) return null;
  const uri = res.assets[0].uri;
  const blob = await (await fetch(uri)).blob();
  const url = await generateUploadUrl();
  const up = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
  if (!up.ok) throw new Error("Photo upload failed");
  return { storageId: (await up.json()).storageId as string, uri };
}
