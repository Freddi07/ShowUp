import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { API_BASE, getToken } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/notifications';

// Point the generated API client at the shared backend and supply the bearer
// token on every request. Configured once at module load, before any hooks run.
setBaseUrl(API_BASE);
setAuthTokenGetter(() => getToken());

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function RootLayoutNav() {
  const { user, isLoading, onboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const publicRoutes = new Set(['login', 'forgot-password']);
    const inPublic = publicRoutes.has(segments[0] as string);
    const inOnboarding = segments[0] === 'onboarding';
    if (!user && !inPublic) {
      router.replace('/login');
      return;
    }
    if (user) {
      // Wait until onboarding status is resolved before routing into the app,
      // so a not-yet-onboarded user is never allowed to slip past the wizard
      // while the status is still loading (or failed and is being retried).
      if (!onboarding) return;
      const needsOnboarding = !onboarding.onboardingCompleted;
      if (needsOnboarding && !inOnboarding) {
        router.replace('/onboarding');
      } else if (!needsOnboarding && (inPublic || inOnboarding)) {
        router.replace('/(tabs)');
      }
    }
  }, [user, isLoading, onboarding, segments, router]);

  // Register for push notifications once the user is signed in. Push is a
  // native-only feature — the expo-notifications APIs throw on the web build,
  // so skip it there.
  useEffect(() => {
    if (user && Platform.OS !== 'web') {
      registerForPushNotifications();
    }
  }, [user]);

  // Deep-link into the relevant customer when a reply notification is tapped.
  useEffect(() => {
    // The notification-response APIs are not available on web; bail out so the
    // web build doesn't throw an uncaught "not available on web" error.
    if (Platform.OS === 'web') return;

    const openFromData = (data: Record<string, unknown> | undefined) => {
      const customerId = data?.customerId;
      if (typeof customerId === 'string' && customerId) {
        router.push(`/customer/${customerId}`);
      }
    };

    // Cold start: app was launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        openFromData(
          response.notification.request.content.data as
            | Record<string, unknown>
            | undefined,
        );
      }
    });

    // Warm taps while the app is running.
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        openFromData(
          response.notification.request.content.data as
            | Record<string, unknown>
            | undefined,
        );
      },
    );
    return () => sub.remove();
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="customer/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="account" options={{ presentation: 'card' }} />
      <Stack.Screen name="statistics" options={{ presentation: 'card' }} />
      <Stack.Screen name="templates" options={{ presentation: 'card' }} />
      <Stack.Screen name="integrations" options={{ presentation: 'card' }} />
      <Stack.Screen name="subscription" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin" options={{ presentation: 'card' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
