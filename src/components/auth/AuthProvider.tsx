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
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { fetchMe } from "@/lib/api/client";
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
  resendVerificationEmail: () => Promise<void>;
  refreshProfile: () => Promise<AuthUserProfile | null>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

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
    } catch (error) {
      console.warn("[auth] failed to sync profile", error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  });

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      void syncProfile(nextUser);
    });

    const unsubToken = onIdTokenChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setIdToken(null);
        return;
      }
      try {
        const token = await nextUser.getIdToken();
        setIdToken(token);
      } catch {
        setIdToken(null);
      }
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

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
        await sendEmailVerification(credential.user);
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
        await sendEmailVerification(current);
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
    [user, profile, idToken, loading, profileLoading],
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
