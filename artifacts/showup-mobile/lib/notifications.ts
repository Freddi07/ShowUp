import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { API_BASE, getToken } from './auth';

/**
 * Show alerts/badges/sounds even when the app is foregrounded, so a reply that
 * arrives while the professional is using the app still surfaces a banner.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let lastRegisteredToken: string | null = null;

/** Resolve the EAS projectId Expo needs to mint a push token, if configured. */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    // Fallback for classic manifests.
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
      ?.projectId
  );
}

/**
 * Ask for permission, obtain the Expo push token, and register it with the
 * backend against the signed-in user. Safe to call repeatedly. Returns the
 * token on success, or null when unavailable (web, simulator, denied, no
 * projectId) — callers should treat null as "push not active", not an error.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Remote push only works on physical devices; web + simulators can't receive.
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (!token) return null;

    // Avoid re-POSTing the same token every foreground.
    if (token === lastRegisteredToken) return token;

    const bearer = await getToken();
    if (!bearer) return null;

    const res = await fetch(`${API_BASE}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    if (res.ok) {
      lastRegisteredToken = token;
      return token;
    }
    return null;
  } catch (err) {
    console.warn('[notifications] registration failed:', err);
    return null;
  }
}

/** Remove this device's token on sign-out so it stops receiving alerts. */
export async function unregisterForPushNotifications(): Promise<void> {
  const token = lastRegisteredToken;
  lastRegisteredToken = null;
  if (!token) return;
  try {
    const bearer = await getToken();
    if (!bearer) return;
    await fetch(`${API_BASE}/api/push/unregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Best-effort; ignore network errors on sign-out.
  }
}
