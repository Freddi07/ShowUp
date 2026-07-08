import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getMe } from '@workspace/api-client-react';
import {
  type AuthUser,
  getToken,
  signInWithEmail,
  signInWithGoogle as doGoogleSignIn,
  signOut as doSignOut,
} from '@/lib/auth';
import { unregisterForPushNotifications } from '@/lib/notifications';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Restore session on startup: if a token exists, validate it via /me.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const me = await getMe();
        if (active) setUser(me as AuthUser);
      } catch {
        await doSignOut();
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const u = await signInWithEmail(email, password);
      setUser(u);
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const u = await doGoogleSignIn();
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    // Drop this device's push token first, while the bearer is still valid.
    await unregisterForPushNotifications();
    await doSignOut();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signInWithGoogle, signOut }),
    [user, isLoading, signIn, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
