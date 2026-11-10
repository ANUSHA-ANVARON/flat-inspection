import { Alert, Platform, ToastAndroid } from "react-native";

export const toast = (msg: string) => (Platform.OS === "android" ? ToastAndroid.show(msg, ToastAndroid.SHORT) : Alert.alert(msg));
export const savedToast = (version: number) => toast(`Saved. Applies to new inspections (version ${version})`);
export const errMsg = (e: any) => String(e?.message ?? e).replace(/^.*Error: /, "");
