import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'showup.auth.token';

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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
