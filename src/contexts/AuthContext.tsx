import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User as FirebaseAuthUser,
} from 'firebase/auth';
import { User, UserRole } from '../types';
import { ADMIN_EMAIL } from '../data/seedData';
import { setStoredAuthToken, syncServerSession } from '../services/financeApi';
import { auth } from '../services/firebase';
import {
  getUserByEmailFromFirestore,
  getUserByPhoneFromFirestore,
  getUserFromFirestore,
  saveUserToFirestore,
  subscribeToUserInFirestore,
} from '../services/firestoreService';

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  city?: string;
  area?: string;
}

export interface AuthActionResult {
  success: boolean;
  error?: string;
  user?: User;
  redirected?: boolean;
  serverTechnicianId?: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  authTokenReady: boolean;
  redirectAuthUser: User | null;
  clearRedirectAuthUser: () => void;
  login: (email: string, password?: string, role?: UserRole) => Promise<AuthActionResult>;
  loginWithGoogle: (preferredRole?: UserRole) => Promise<AuthActionResult>;
  register: (userData: RegisterInput) => Promise<AuthActionResult>;
  logout: () => void;
  updateProfile: (updatedData: Partial<User>) => Promise<boolean>;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REGISTERED_USERS_KEY = 'kormigo_registered_users';
const PENDING_GOOGLE_ROLE_KEY = 'servexa_pending_google_role';
const PENDING_GOOGLE_REDIRECT_KEY = 'servexa_pending_google_redirect';

function isLegacyDemoUser(u: Partial<User> | null | undefined): boolean {
  if (!u) return true;
  const id = (u.id || '').toLowerCase();
  const email = (u.email || '').toLowerCase();
  return (
    id.includes('demo') ||
    email.includes('@servexa.demo') ||
    email.includes('.demo') ||
    id === 'tech-1' ||
    id === 'cust-1'
  );
}

function loadRegisteredUsers(): User[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    const parsed: User[] = JSON.parse(raw);
    const cleaned = parsed.filter((u) => !isLegacyDemoUser(u));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

function cacheRegisteredUser(user: User) {
  try {
    const existing = loadRegisteredUsers().filter(
      (u) => u.id !== user.id && (u.email || '').toLowerCase() !== (user.email || '').toLowerCase()
    );
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([user, ...existing]));
  } catch {
    try {
      const existingLight = loadRegisteredUsers()
        .filter(
          (u) => u.id !== user.id && (u.email || '').toLowerCase() !== (user.email || '').toLowerCase()
        )
        .map((u) => ({ ...u, avatar: '' }));
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([user, ...existingLight]));
    } catch {
      // ignore storage errors
    }
  }
}

function safeCacheActiveUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem('kormigo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kormigo_user');
    }
  } catch {
    // ignore storage errors
  }
}

function findMatchingTechnicianIdForUser(user: User): string | undefined {
  if (user.role !== 'TECHNICIAN') return undefined;
  try {
    const raw = localStorage.getItem('kormigo_technicians');
    if (!raw) return undefined;
    const list = JSON.parse(raw) as Array<{ id: string; userId?: string; email?: string }>;
    const match = list.find(
      (t) =>
        t.userId === user.id ||
        (user.email && t.email && t.email.toLowerCase() === user.email.toLowerCase())
    );
    return match?.id;
  } catch {
    return undefined;
  }
}

function mapFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return `ডোমেইন (${host}) Firebase-এ অনুমোদিত নয়। Firebase Console > Authentication > Settings > Authorized domains-এ "${host}" যোগ করুন।`;
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google সাইন-ইন পপ-আপ বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Firebase Console-এ Google Sign-in পদ্ধতি চালু করা নেই। Authentication > Sign-in method থেকে Google চালু করুন।';
  }
  if (code === 'auth/network-request-failed') {
    return 'নেটওয়ার্ক সংযোগ ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।';
  }
  return err?.message || 'Google sign-in could not be completed.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kormigo_user');
    if (saved) {
      try {
        const parsed: User = JSON.parse(saved);
        if (isLegacyDemoUser(parsed)) {
          localStorage.removeItem('kormigo_user');
          return null;
        }
        if ((parsed.email || '').trim().toLowerCase() === ADMIN_EMAIL && parsed.role !== 'ADMIN') {
          parsed.role = 'ADMIN';
        }
        return parsed;
      } catch (e) {
        console.error('Error parsing stored user', e);
      }
    }
    return null;
  });

  const [authTokenReady, setAuthTokenReady] = useState<boolean>(false);
  const [redirectAuthUser, setRedirectAuthUser] = useState<User | null>(null);
  const sessionSeqRef = useRef<number>(0);
  const currentUserRef = useRef<User | null>(currentUser);
  const pendingProfileWritesRef = useRef<number>(0);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const clearRedirectAuthUser = () => setRedirectAuthUser(null);

  const ensureServerSession = async (
    user: User | null,
    explicitPreferredTechId?: string
  ): Promise<string | null> => {
    const seq = ++sessionSeqRef.current;
    if (!user) {
      setStoredAuthToken(null);
      setAuthTokenReady(false);
      return null;
    }
    setAuthTokenReady(false);
    try {
      const preferredTechId = explicitPreferredTechId || findMatchingTechnicianIdForUser(user);
      const session = await syncServerSession(user, preferredTechId);
      if (sessionSeqRef.current === seq) {
        setAuthTokenReady(true);
      }
      return session.technicianId ?? null;
    } catch {
      if (sessionSeqRef.current === seq) {
        setAuthTokenReady(false);
      }
      return null;
    }
  };

  // Always keep active user cache synchronized in localStorage whenever ANY profile field (including avatar) changes
  useEffect(() => {
    safeCacheActiveUser(currentUser);
    if (currentUser) {
      cacheRegisteredUser(currentUser);
    }
  }, [currentUser]);

  // Only re-bootstrap backend JWT session when user identity or role changes
  useEffect(() => {
    void ensureServerSession(currentUser);
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = subscribeToUserInFirestore(currentUser.id, (remoteUser) => {
      if (!remoteUser) return;
      if (pendingProfileWritesRef.current > 0) return;
      setCurrentUser((prev) => {
        if (!prev || prev.id !== remoteUser.id) return prev;
        const merged = { ...prev, ...remoteUser };
        if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
        cacheRegisteredUser(merged);
        safeCacheActiveUser(merged);
        return merged;
      });
    });
    return () => unsub();
  }, [currentUser?.id]);

  const finalizeGoogleFirebaseUser = async (
    fbUser: FirebaseAuthUser,
    preferredRole?: UserRole
  ): Promise<User> => {
    const fbEmail = (fbUser.email || '').trim().toLowerCase();
    const isDesignatedAdmin = fbEmail === ADMIN_EMAIL;

    let matchedUser = isDesignatedAdmin
      ? (await getUserFromFirestore('admin-wasin')) ||
        (await getUserByEmailFromFirestore(ADMIN_EMAIL)) ||
        (await getUserFromFirestore(fbUser.uid))
      : await getUserFromFirestore(fbUser.uid);

    if (!matchedUser && fbEmail) {
      matchedUser = await getUserByEmailFromFirestore(fbEmail);
    }

    if (!matchedUser) {
      const resolvedRole: UserRole = isDesignatedAdmin
        ? 'ADMIN'
        : preferredRole === 'TECHNICIAN'
          ? 'TECHNICIAN'
          : 'CUSTOMER';

      const safeName = (
        fbUser.displayName || (isDesignatedAdmin ? 'Wasin Ahmed' : 'Servexa User')
      )
        .trim()
        .slice(0, 150);

      matchedUser = {
        id: isDesignatedAdmin ? 'admin-wasin' : fbUser.uid,
        name: safeName,
        email: fbEmail || fbUser.email || '',
        phone: fbUser.phoneNumber || '',
        role: resolvedRole,
        avatar: fbUser.photoURL || '',
        division: '',
        district: '',
        city: '',
        area: '',
        address: '',
        phoneVerified: !!fbUser.phoneNumber,
        nidVerified: false,
        createdAt: new Date().toISOString().split('T')[0],
      };
      await saveUserToFirestore(matchedUser);
    } else if (isDesignatedAdmin && matchedUser.role !== 'ADMIN') {
      matchedUser = { ...matchedUser, role: 'ADMIN' };
      await saveUserToFirestore(matchedUser);
    }

    cacheRegisteredUser(matchedUser);
    await ensureServerSession(matchedUser);
    setCurrentUser(matchedUser);
    return matchedUser;
  };

  // Complete Google Sign-In if browser returned from signInWithRedirect (mobile / popup-blocked environments)
  useEffect(() => {
    let active = true;
    const handleRedirectAuth = async () => {
      try {
        const res = await getRedirectResult(auth);
        const pendingRole = localStorage.getItem(PENDING_GOOGLE_ROLE_KEY) as UserRole | null;
        localStorage.removeItem(PENDING_GOOGLE_ROLE_KEY);
        localStorage.removeItem(PENDING_GOOGLE_REDIRECT_KEY);

        if (active && res?.user) {
          const user = await finalizeGoogleFirebaseUser(res.user, pendingRole || undefined);
          if (active) {
            setRedirectAuthUser(user);
          }
        }
      } catch (err: any) {
        localStorage.removeItem(PENDING_GOOGLE_ROLE_KEY);
        localStorage.removeItem(PENDING_GOOGLE_REDIRECT_KEY);
        console.warn('Google redirect sign-in check:', err);
      }
    };
    void handleRedirectAuth();
    return () => {
      active = false;
    };
  }, []);

  const loginWithGoogle = async (preferredRole?: UserRole): Promise<AuthActionResult> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const res = await signInWithPopup(auth, provider);
      const user = await finalizeGoogleFirebaseUser(res.user, preferredRole);
      return { success: true, user };
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          if (preferredRole) {
            localStorage.setItem(PENDING_GOOGLE_ROLE_KEY, preferredRole);
          } else {
            localStorage.removeItem(PENDING_GOOGLE_ROLE_KEY);
          }
          localStorage.setItem(PENDING_GOOGLE_REDIRECT_KEY, '1');
          await signInWithRedirect(auth, provider);
          return { success: false, redirected: true };
        } catch (redirectErr: any) {
          localStorage.removeItem(PENDING_GOOGLE_ROLE_KEY);
          localStorage.removeItem(PENDING_GOOGLE_REDIRECT_KEY);
          return {
            success: false,
            error: mapFirebaseAuthError(redirectErr),
          };
        }
      }

      console.warn('Google sign-in error:', err);
      return {
        success: false,
        error: mapFirebaseAuthError(err),
      };
    }
  };

  const login = async (email: string, password?: string): Promise<AuthActionResult> => {
    const identifier = email.trim();
    const emailLower = identifier.toLowerCase();

    if (!identifier) {
      return {
        success: false,
        error: 'অনুগ্রহ করে আপনার ইমেইল বা ফোন নম্বর দিন।',
      };
    }

    // Designated Platform Admin check
    if (emailLower === ADMIN_EMAIL) {
      if ((password || '') !== 'W@sin1234') {
        return {
          success: false,
          error: 'ভুল অ্যাডমিন পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড লিখুন।',
        };
      }

      const existingAdmin =
        (await getUserFromFirestore('admin-wasin')) ||
        (await getUserByEmailFromFirestore(ADMIN_EMAIL));

      const adminUser: User = {
        id: existingAdmin?.id || 'admin-wasin',
        name: existingAdmin?.name || 'Wasin Ahmed',
        email: ADMIN_EMAIL,
        phone: existingAdmin?.phone || '',
        role: 'ADMIN',
        avatar: existingAdmin?.avatar || '',
        division: existingAdmin?.division || 'Dhaka',
        district: existingAdmin?.district || 'Dhaka',
        city: existingAdmin?.city || 'Dhaka',
        area: existingAdmin?.area || '',
        address: existingAdmin?.address || '',
        phoneVerified: existingAdmin?.phoneVerified ?? true,
        nidVerified: existingAdmin?.nidVerified ?? true,
        createdAt: existingAdmin?.createdAt || new Date().toISOString().split('T')[0],
      };

      safeCacheActiveUser(adminUser);
      cacheRegisteredUser(adminUser);
      if (!existingAdmin) {
        await saveUserToFirestore(adminUser);
      }
      await ensureServerSession(adminUser);
      setCurrentUser(adminUser);
      return { success: true, user: adminUser };
    }

    const registered = loadRegisteredUsers();
    const matchedRegistered = registered.find(
      (u) =>
        (u.email || '').trim().toLowerCase() === emailLower ||
        (!!u.phone && u.phone.trim() === identifier)
    );

    if (matchedRegistered) {
      if (matchedRegistered.password && matchedRegistered.password !== (password || '')) {
        return {
          success: false,
          error: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে রেজিস্ট্রেশনের সময় দেওয়া সঠিক পাসওয়ার্ড লিখুন।',
        };
      }
      // Prefer live Firestore user record so updated profile/avatar from any session is never overwritten by stale local cache
      const liveFsUser =
        (await getUserFromFirestore(matchedRegistered.id)) ||
        (matchedRegistered.email
          ? await getUserByEmailFromFirestore(matchedRegistered.email)
          : null);
      const mergedUser: User = liveFsUser
        ? {
            ...matchedRegistered,
            ...liveFsUser,
            password: liveFsUser.password || matchedRegistered.password,
          }
        : matchedRegistered;

      safeCacheActiveUser(mergedUser);
      cacheRegisteredUser(mergedUser);
      if (!liveFsUser) {
        await saveUserToFirestore(mergedUser);
      }
      await ensureServerSession(mergedUser);
      setCurrentUser(mergedUser);
      return { success: true, user: mergedUser };
    }

    // Query Firebase Firestore by email, phone, or document ID (cross-device Vercel support)
    let fsUser = await getUserByEmailFromFirestore(emailLower);
    if (!fsUser) {
      fsUser = await getUserByPhoneFromFirestore(identifier);
    }
    if (!fsUser) {
      fsUser = await getUserFromFirestore(identifier);
    }

    if (fsUser && !isLegacyDemoUser(fsUser)) {
      if (fsUser.password && fsUser.password !== (password || '')) {
        return {
          success: false,
          error: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে রেজিস্ট্রেশনের সময় দেওয়া সঠিক পাসওয়ার্ড লিখুন।',
        };
      }
      cacheRegisteredUser(fsUser);
      await ensureServerSession(fsUser);
      setCurrentUser(fsUser);
      return { success: true, user: fsUser };
    }

    return {
      success: false,
      error:
        'এই ইমেইল বা ফোন নম্বরে কোনো রেজিস্টার্ড একাউন্ট পাওয়া যায়নি। অনুগ্রহ করে আগে রেজিস্ট্রেশন করুন অথবা সঠিক ইমেইল দিন।',
    };
  };

  const register = async (userData: RegisterInput): Promise<AuthActionResult> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanPhone = (userData.phone || '').trim();

    if (!cleanEmail) {
      return { success: false, error: 'অনুগ্রহ করে একটি সঠিক ইমেইল দিন।' };
    }

    if (cleanEmail === ADMIN_EMAIL) {
      return {
        success: false,
        error: 'এই ইমেইলটি প্ল্যাটফর্ম অ্যাডমিনের জন্য সংরক্ষিত। সরাসরি লগইন পেজ থেকে লগইন করুন।',
      };
    }

    const registered = loadRegisteredUsers();
    const localDuplicate = registered.find(
      (u) => (u.email || '').trim().toLowerCase() === cleanEmail
    );
    if (localDuplicate) {
      return {
        success: false,
        error: 'এই ইমেইল দিয়ে আগেই একাউন্ট তৈরি করা হয়েছে। অনুগ্রহ করে লগইন করুন।',
      };
    }

    const firestoreDuplicate = await getUserByEmailFromFirestore(cleanEmail);
    if (firestoreDuplicate && !isLegacyDemoUser(firestoreDuplicate)) {
      return {
        success: false,
        error: 'এই ইমেইল দিয়ে আগেই একাউন্ট তৈরি করা হয়েছে। অনুগ্রহ করে লগইন করুন।',
      };
    }

    const safeRole: UserRole = userData.role === 'TECHNICIAN' ? 'TECHNICIAN' : 'CUSTOMER';

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: (userData.name.trim() || 'Servexa User').slice(0, 150),
      email: cleanEmail,
      phone: cleanPhone,
      password: userData.password,
      role: safeRole,
      avatar: '',
      division: '',
      district: '',
      city: userData.city || '',
      area: userData.area || '',
      address: '',
      phoneVerified: !!cleanPhone,
      nidVerified: false,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const existing = registered.filter(
      (u) =>
        (u.email || '').trim().toLowerCase() !== cleanEmail &&
        (!cleanPhone || (u.phone || '').trim() !== cleanPhone)
    );
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([newUser, ...existing]));

    await saveUserToFirestore(newUser);

    const serverTechnicianId = await ensureServerSession(newUser);
    setCurrentUser(newUser);
    return { success: true, user: newUser, serverTechnicianId };
  };

  const logout = () => {
    sessionSeqRef.current += 1;
    setStoredAuthToken(null);
    setAuthTokenReady(false);
    setRedirectAuthUser(null);
    setCurrentUser(null);
    void signOut(auth).catch(() => {});
  };

  const updateProfile = async (updatedData: Partial<User>): Promise<boolean> => {
    const baseUser = currentUserRef.current || currentUser;
    if (!baseUser) return false;
    const nextUser: User = { ...baseUser, ...updatedData };
    currentUserRef.current = nextUser;
    safeCacheActiveUser(nextUser);
    cacheRegisteredUser(nextUser);
    setCurrentUser(nextUser);

    pendingProfileWritesRef.current += 1;
    try {
      return await saveUserToFirestore(nextUser);
    } finally {
      pendingProfileWritesRef.current = Math.max(0, pendingProfileWritesRef.current - 1);
    }
  };

  const switchRole = async (targetRole: UserRole) => {
    const baseUser = currentUserRef.current || currentUser;
    if (!baseUser) return;
    const nextUser: User = { ...baseUser, role: targetRole };
    currentUserRef.current = nextUser;
    safeCacheActiveUser(nextUser);
    cacheRegisteredUser(nextUser);
    setCurrentUser(nextUser);
    await saveUserToFirestore(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        authTokenReady,
        redirectAuthUser,
        clearRedirectAuthUser,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
