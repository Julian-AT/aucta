import { Platform } from "react-native";
import Constants from "expo-constants";

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (__DEV__ && Platform.OS !== "web") {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const lanIp = hostUri.split(":")[0];
      return `http://${lanIp}:3000`;
    }
  }

  return envUrl || "http://localhost:3000";
}

export const API_URL = resolveApiUrl();
