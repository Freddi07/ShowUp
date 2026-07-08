import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const TOKEN_KEY = 'showup.auth.token';

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

// The web dashboard is served from the same origin as the API (shared proxy),
// so "manage on web" links are built from this base.
export const WEB_BASE = API_BASE;

let cachedToken: string | null = null;
let loaded = false;

/** Returns the current bearer token, loading from storage on first call. */
export async function getToken(): Promise<string | null> {
  if (!loaded) {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
    loaded = true;
  }
  return cachedToken;
}

async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  loaded = true;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  cachedToken = null;
  loaded = true;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

export class SignInError extends Error {}

/** Signs in with email + password against the shared better-auth backend. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new SignInError('Kunne ikke koble til serveren. Sjekk nettet.');
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new SignInError('Feil e-post eller passord.');
    }
    throw new SignInError('Innlogging mislyktes. Prøv igjen.');
  }

  const token = res.headers.get('set-auth-token');
  if (!token) {
    throw new SignInError('Serveren returnerte ingen økt. Prøv igjen.');
  }
  await saveToken(token);

  const body = (await res.json()) as { user?: AuthUser };
  if (!body.user) throw new SignInError('Ugyldig svar fra serveren.');
  return body.user;
}

/**
 * Requests a password-reset email. better-auth intentionally returns 200 even
 * when the account does not exist (to avoid leaking which emails are
 * registered), so callers should always show the same confirmation. Only
 * network failures surface as an error.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo: '/reset-password' }),
    });
  } catch {
    throw new SignInError('Kunne ikke koble til serveren. Sjekk nettet.');
  }
}

/** Raised (with message 'CANCELLED') when the user closes the Google sheet. */
const GOOGLE_CANCELLED = 'CANCELLED';

/**
 * Signs in with Google via an in-app browser. The server bridge
 * (`/api/mobile-oauth/google`) runs the OAuth flow and deep-links back with the
 * signed session token, which we store like any other bearer token.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  const returnUrl = Linking.createURL('auth-callback');
  const startUrl = `${API_BASE}/api/mobile-oauth/google?returnUrl=${encodeURIComponent(returnUrl)}`;

  let result: WebBrowser.WebBrowserAuthSessionResult;
  try {
    result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
  } catch {
    throw new SignInError('Kunne ikke åpne Google-innlogging.');
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new SignInError(GOOGLE_CANCELLED);
  }
  if (result.type !== 'success' || !result.url) {
    throw new SignInError('Google-innlogging mislyktes. Prøv igjen.');
  }

  const { queryParams } = Linking.parse(result.url);
  const token = queryParams?.token;
  if (queryParams?.error || typeof token !== 'string' || !token) {
    throw new SignInError('Google-innlogging mislyktes. Prøv igjen.');
  }

  await saveToken(token);
  return fetchCurrentUser();
}

/** Loads the signed-in user from better-auth using the stored bearer token. */
async function fetchCurrentUser(): Promise<AuthUser> {
  const token = await getToken();
  if (!token) throw new SignInError('Fant ingen økt. Prøv igjen.');
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new SignInError('Kunne ikke koble til serveren. Sjekk nettet.');
  }
  if (!res.ok) throw new SignInError('Kunne ikke hente brukeren. Prøv igjen.');
  const body = (await res.json()) as { user?: AuthUser } | null;
  if (!body?.user) throw new SignInError('Kunne ikke hente brukeren. Prøv igjen.');
  return body.user;
}

export class ChangePasswordError extends Error {}

/** Changes the signed-in user's password via better-auth. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const token = await getToken();
  if (!token) throw new ChangePasswordError('Du er ikke logget inn.');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      }),
    });
  } catch {
    throw new ChangePasswordError('Kunne ikke koble til serveren. Sjekk nettet.');
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      throw new ChangePasswordError('Feil nåværende passord.');
    }
    throw new ChangePasswordError('Kunne ikke endre passord. Prøv igjen.');
  }

  // better-auth may rotate the session token on password change.
  const rotated = res.headers.get('set-auth-token');
  if (rotated) await saveToken(rotated);
}

/** Signs out locally and best-effort on the server. */
export async function signOut(): Promise<void> {
  const token = cachedToken;
  await clearToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/sign-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore network errors on sign-out.
    }
  }
}
