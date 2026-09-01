"use client";

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { fetchMe, fetchVerificationLink } from "@/lib/api/client";
import type { AuthUserProfile } from "@/lib/auth/getOrCreateUser";

type SignUpInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  profile: AuthUserProfile | null;
  idToken: string | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<string>;
  refreshEmailVerification: () => Promise<boolean>;
  refreshProfile: () => Promise<AuthUserProfile | null>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_READY_TIMEOUT_MS = 5_000;

function waitForAuthReady(
  auth: ReturnType<typeof getFirebaseAuth>,
): Promise<void> {
  return Promise.race([
    auth.authStateReady(),
    new Promise<void>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Firebase auth state check timed out")),
        AUTH_READY_TIMEOUT_MS,
      );
    }),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authEpoch, setAuthEpoch] = useState(0);

  const syncProfile = useEffectEvent(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      setIdToken(token);
      const nextProfile = await fetchMe(token, {
        name: firebaseUser.displayName ?? undefined,
      });
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  });

  useEffect(() => {
    let cancelled = false;
    let unsubAuth = () => {};
    let unsubToken = () => {};

    // Hard ceiling so Capacitor/WKWebView can never leave the app on
    // "Starting up…" if Firebase authStateReady hangs.
    const hardTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, AUTH_READY_TIMEOUT_MS + 1_000);

    async function initAuth() {
      try {
        const auth = getFirebaseAuth();

        unsubAuth = onAuthStateChanged(auth, (nextUser) => {
          if (cancelled) return;
          setUser(nextUser);
          setLoading(false);
          void syncProfile(nextUser);
        });

        unsubToken = onIdTokenChanged(auth, async (nextUser) => {
          if (!nextUser) {
            setIdToken(null);
            return;
          }
          try {
            const token = await nextUser.getIdToken();
            if (!cancelled) setIdToken(token);
          } catch {
            if (!cancelled) setIdToken(null);
          }
        });

        try {
          await waitForAuthReady(auth);
        } catch {
          // Continue with currentUser after timeout or init failure.
        }

        if (cancelled) return;

        setUser(auth.currentUser);
        setLoading(false);
        void syncProfile(auth.currentUser);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void initAuth();

    return () => {
      cancelled = true;
      window.clearTimeout(hardTimer);
      unsubAuth();
      unsubToken();
    };
  }, []);

  useEffect(() => {
    if (!user || user.emailVerified) return;

    async function refreshIfVisible() {
      if (document.visibilityState !== "visible") return;
      const current = getFirebaseAuth().currentUser;
      if (!current || current.emailVerified) return;
      try {
        await current.reload();
        if (!current.emailVerified) return;
        setUser(getFirebaseAuth().currentUser);
        setAuthEpoch((epoch) => epoch + 1);
        const token = await current.getIdToken(true);
        setIdToken(token);
      } catch {
        // Keep the unverified session; the banner still offers a resend.
      }
    }

    function onVisible() {
      void refreshIfVisible();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      idToken,
      loading,
      profileLoading,
      async signUp({ name, email, phone, password }) {
        const auth = getFirebaseAuth();
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(credential.user, { displayName: name.trim() });
        const token = await credential.user.getIdToken(true);
        setIdToken(token);
        const nextProfile = await fetchMe(token, {
          name: name.trim(),
          phone: phone.trim(),
        });
        setProfile(nextProfile);
      },
      async signIn(email, password) {
        const auth = getFirebaseAuth();
        const credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        const token = await credential.user.getIdToken();
        setIdToken(token);
        const nextProfile = await fetchMe(token, {
          name: credential.user.displayName ?? undefined,
        });
        setProfile(nextProfile);
      },
      async logOut() {
        await signOut(getFirebaseAuth());
        setProfile(null);
        setIdToken(null);
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      },
      async resendVerificationEmail() {
        const current = getFirebaseAuth().currentUser;
        if (!current) {
          throw new Error("You must be signed in to verify your email.");
        }
        const token = await current.getIdToken();
        return fetchVerificationLink(token);
      },
      async refreshEmailVerification() {
        const current = getFirebaseAuth().currentUser;
        if (!current) return false;
        try {
          await current.reload();
        } catch {
          return current.emailVerified;
        }
        setUser(getFirebaseAuth().currentUser);
        setAuthEpoch((epoch) => epoch + 1);
        if (current.emailVerified) {
          try {
            const token = await current.getIdToken(true);
            setIdToken(token);
          } catch {
            // emailVerified is still true even if the token refresh fails.
          }
        }
        return current.emailVerified;
      },
      async refreshProfile() {
        const current = getFirebaseAuth().currentUser;
        if (!current) {
          setProfile(null);
          return null;
        }
        const token = await current.getIdToken();
        const nextProfile = await fetchMe(token);
        setProfile(nextProfile);
        return nextProfile;
      },
      async getIdToken(forceRefresh = false) {
        const current = getFirebaseAuth().currentUser;
        if (!current) return null;
        const token = await current.getIdToken(forceRefresh);
        setIdToken(token);
        return token;
      },
    }),
    [user, profile, idToken, loading, profileLoading, authEpoch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
