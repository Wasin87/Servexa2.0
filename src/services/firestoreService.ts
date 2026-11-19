import {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Booking,
  ChatMessage,
  MaintenanceReminder,
  NotificationItem,
  ReportItem,
  Review,
  Technician,
  User,
  WarrantyClaim
} from '../types';
import { initialCategories } from '../data/seedData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
    },
    operationType,
    path
  };
  console.warn('Firestore Error Handled:', JSON.stringify(errInfo));
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: client is offline.');
    }
  }
}

void testConnection();

/**
 * Ensures service categories exist in Firestore (never seeds demo technicians or dummy users).
 */
export async function initializeFirestoreDatabase(): Promise<{ initialized: boolean; message: string }> {
  try {
    const catSnap = await getDocs(collection(db, 'categories'));
    if (catSnap.empty) {
      for (const cat of initialCategories) {
        await setDoc(doc(db, 'categories', cat.id), stripUndefined(cat));
      }
    }

    return { initialized: true, message: 'Firestore categories ready.' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'categories');
    return { initialized: false, message: 'Firestore initialization failed: ' + String(error) };
  }
}

/**
 * Users
 */
export async function saveUserToFirestore(user: User): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), stripUndefined(user), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

export async function getUserFromFirestore(userId: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? (snap.data() as User) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return null;
  }
}

export async function getUserByEmailFromFirestore(email: string): Promise<User | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as User;
    }
    // Fallback case-insensitive scan if stored with mixed casing
    const allSnap = await getDocs(collection(db, 'users'));
    for (const d of allSnap.docs) {
      const u = d.data() as User;
      if ((u.email || '').trim().toLowerCase() === cleanEmail) {
        return u;
      }
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users?email=${cleanEmail}`);
    return null;
  }
}

export async function getUserByPhoneFromFirestore(phone: string): Promise<User | null> {
  const cleanPhone = phone.trim();
  if (!cleanPhone) return null;
  try {
    const q = query(collection(db, 'users'), where('phone', '==', cleanPhone), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users?phone=${cleanPhone}`);
    return null;
  }
}

/**
 * Technicians
 */
export function subscribeToFirestoreTechnicians(onUpdate: (techs: Technician[]) => void) {
  const colRef = collection(db, 'technicians');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Technician[] = [];
      snapshot.forEach((d) => list.push(d.data() as Technician));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'technicians');
    }
  );
}

export async function saveTechnicianToFirestore(tech: Technician): Promise<void> {
  try {
    await setDoc(doc(db, 'technicians', tech.id), stripUndefined(tech), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `technicians/${tech.id}`);
  }
}

export async function deleteTechnicianFromFirestore(technicianId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'technicians', technicianId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `technicians/${technicianId}`);
  }
}

/**
 * Bookings
 */
export function subscribeToFirestoreBookings(onUpdate: (bookings: Booking[]) => void) {
  const q = collection(db, 'bookings');
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Booking);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    }
  );
}

export async function saveBookingToFirestore(booking: Booking): Promise<void> {
  try {
    await setDoc(doc(db, 'bookings', booking.id), stripUndefined(booking));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bookings/${booking.id}`);
    throw error;
  }
}

export async function updateBookingInFirestore(bookingId: string, updates: Partial<Booking>): Promise<void> {
  try {
    await updateDoc(doc(db, 'bookings', bookingId), stripUndefined(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

/**
 * Reviews
 */
export function subscribeToFirestoreReviews(onUpdate: (reviews: Review[]) => void) {
  return onSnapshot(
    collection(db, 'reviews'),
    (snapshot) => {
      const list: Review[] = [];
      snapshot.forEach((d) => list.push(d.data() as Review));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
    }
  );
}

export async function saveReviewToFirestore(review: Review): Promise<void> {
  try {
    await setDoc(doc(db, 'reviews', review.id), stripUndefined(review));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reviews/${review.id}`);
  }
}

/**
 * Warranty Claims
 */
export function subscribeToFirestoreWarranties(onUpdate: (claims: WarrantyClaim[]) => void) {
  return onSnapshot(
    collection(db, 'warranties'),
    (snapshot) => {
      const list: WarrantyClaim[] = [];
      snapshot.forEach((d) => list.push(d.data() as WarrantyClaim));
      list.sort((a, b) => new Date(b.requestDate || 0).getTime() - new Date(a.requestDate || 0).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'warranties');
    }
  );
}

export async function saveWarrantyToFirestore(claim: WarrantyClaim): Promise<void> {
  try {
    await setDoc(doc(db, 'warranties', claim.id), stripUndefined(claim));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `warranties/${claim.id}`);
  }
}

/**
 * Notifications
 */
export function subscribeToFirestoreNotifications(onUpdate: (items: NotificationItem[]) => void) {
  return onSnapshot(
    collection(db, 'notifications'),
    (snapshot) => {
      const list: NotificationItem[] = [];
      snapshot.forEach((d) => list.push(d.data() as NotificationItem));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    }
  );
}

export async function saveNotificationToFirestore(notif: NotificationItem): Promise<void> {
  try {
    await setDoc(doc(db, 'notifications', notif.id), stripUndefined(notif));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notif.id}`);
  }
}

export async function markNotificationReadInFirestore(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

/**
 * Reports / Disputes
 */
export function subscribeToFirestoreReports(onUpdate: (items: ReportItem[]) => void) {
  return onSnapshot(
    collection(db, 'reports'),
    (snapshot) => {
      const list: ReportItem[] = [];
      snapshot.forEach((d) => list.push(d.data() as ReportItem));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'reports');
    }
  );
}

export async function saveReportToFirestore(report: ReportItem): Promise<void> {
  try {
    await setDoc(doc(db, 'reports', report.id), stripUndefined(report));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reports/${report.id}`);
  }
}

/**
 * Maintenance Reminders
 */
export function subscribeToFirestoreReminders(onUpdate: (items: MaintenanceReminder[]) => void) {
  return onSnapshot(
    collection(db, 'maintenanceReminders'),
    (snapshot) => {
      const list: MaintenanceReminder[] = [];
      snapshot.forEach((d) => list.push(d.data() as MaintenanceReminder));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'maintenanceReminders');
    }
  );
}

export async function saveMaintenanceReminderToFirestore(rem: MaintenanceReminder): Promise<void> {
  try {
    await setDoc(doc(db, 'maintenanceReminders', rem.id), stripUndefined(rem));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `maintenanceReminders/${rem.id}`);
  }
}

export async function deleteMaintenanceReminderFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'maintenanceReminders', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `maintenanceReminders/${id}`);
  }
}

/**
 * Chat Messages
 */
export function subscribeToFirestoreChatMessages(onUpdate: (items: ChatMessage[]) => void) {
  return onSnapshot(
    collection(db, 'chatMessages'),
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((d) => list.push(d.data() as ChatMessage));
      list.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'chatMessages');
    }
  );
}

export async function saveChatMessageToFirestore(msg: ChatMessage): Promise<void> {
  try {
    await setDoc(doc(db, 'chatMessages', msg.id), stripUndefined(msg));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `chatMessages/${msg.id}`);
  }
}

export async function markChatMessageReadInFirestore(messageId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'chatMessages', messageId), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `chatMessages/${messageId}`);
  }
}
