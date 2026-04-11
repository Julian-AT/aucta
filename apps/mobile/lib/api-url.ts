import { Platform } from "react-native";
import Constants from "expo-constants";

/** localhost / 127.0.0.1 only work on simulators; physical devices need a LAN IP. */
function isNonLocalhostHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
}

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // Explicit LAN / tunnel URL wins — Metro and API often run on different machines.
  if (envUrl && isNonLocalhostHttpUrl(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }

  if (__DEV__ && Platform.OS !== "web") {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const lanIp = hostUri.split(":")[0];
      return `http://${lanIp}:3000`;
    }
  }

  return envUrl?.replace(/\/$/, "") || "http://localhost:3000";
}

export const API_URL = resolveApiUrl();
