import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { User, UserRole } from '../types';
import { ADMIN_EMAIL } from '../data/seedData';
import { setStoredAuthToken, syncServerSession } from '../services/financeApi';
import { auth } from '../services/firebase';
import {
  getUserByEmailFromFirestore,
  getUserFromFirestore,
  saveUserToFirestore,
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

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  authTokenReady: boolean;
  login: (
    email: string,
    password?: string,
    role?: UserRole
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (
    userData: RegisterInput
  ) => Promise<{ success: boolean; error?: string; user?: User; serverTechnicianId?: string | null }>;
  logout: () => void;
  updateProfile: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REGISTERED_USERS_KEY = 'kormigo_registered_users';

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
  const sessionSeqRef = useRef<number>(0);

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

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('kormigo_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('kormigo_user');
    }
    void ensureServerSession(currentUser);
  }, [currentUser?.id, currentUser?.role]);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const fbUser = res.user;
      const fbEmail = (fbUser.email || '').trim().toLowerCase();
      const isDesignatedAdmin = fbEmail === ADMIN_EMAIL;

      let matchedUser = await getUserFromFirestore(fbUser.uid);
      if (!matchedUser && fbEmail) {
        matchedUser = await getUserByEmailFromFirestore(fbEmail);
      }

      if (!matchedUser) {
        matchedUser = {
          id: isDesignatedAdmin ? 'admin-wasin' : fbUser.uid,
          name: fbUser.displayName || (isDesignatedAdmin ? 'Wasin Ahmed' : 'Servexa User'),
          email: fbEmail || fbUser.email || '',
          phone: fbUser.phoneNumber || '',
          role: isDesignatedAdmin ? 'ADMIN' : 'CUSTOMER',
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
      return { success: true, user: matchedUser };
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      return {
        success: false,
        error: err?.message || 'Google sign-in could not be completed.',
      };
    }
  };

  const login = async (email: string, password?: string) => {
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
        (await getUserByEmailFromFirestore(ADMIN_EMAIL)) ||
        (await getUserFromFirestore('admin-wasin'));

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

      cacheRegisteredUser(adminUser);
      void saveUserToFirestore(adminUser);
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
      await ensureServerSession(matchedRegistered);
      setCurrentUser(matchedRegistered);
      void saveUserToFirestore(matchedRegistered);
      return { success: true, user: matchedRegistered };
    }

    // Query Firebase Firestore by email or document ID
    let fsUser = await getUserByEmailFromFirestore(emailLower);
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

  const register = async (userData: RegisterInput) => {
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
      name: userData.name.trim(),
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
    setCurrentUser(null);
    void signOut(auth).catch(() => {});
  };

  const updateProfile = (updatedData: Partial<User>) => {
    if (currentUser) {
      const nextUser = { ...currentUser, ...updatedData };
      setCurrentUser(nextUser);
      cacheRegisteredUser(nextUser);
      void saveUserToFirestore(nextUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        authTokenReady,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
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
