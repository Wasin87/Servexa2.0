import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  Booking,
  BookingStatus,
  ChatMessage,
  Invoice,
  MaintenanceReminder,
  NotificationItem,
  PortfolioItem,
  ReportItem,
  Review,
  ServiceCategory,
  Technician,
  WarrantyClaim,
  AvailabilityStatus,
} from '../types';
import { initialCategories } from '../data/seedData';
import { useAuth } from './AuthContext';
import { resolveCustomerCoordinates } from '../utils/geoUtils';
import {
  getStoredAuthToken,
  syncTechnicianToServer,
  updateServerBookingStatus,
} from '../services/financeApi';
import {
  initializeFirestoreDatabase,
  subscribeToFirestoreCategories,
  saveCategoryToFirestore,
  updateCategoryInFirestore,
  deleteCategoryFromFirestore,
  subscribeToFirestoreBookings,
  saveBookingToFirestore,
  updateBookingInFirestore,
  deleteBookingFromFirestore,
  subscribeToFirestoreTechnicians,
  saveTechnicianToFirestore,
  updateTechnicianInFirestore,
  deleteTechnicianFromFirestore,
  subscribeToFirestoreReviews,
  saveReviewToFirestore,
  updateReviewInFirestore,
  subscribeToFirestoreWarranties,
  saveWarrantyToFirestore,
  deleteWarrantyFromFirestore,
  subscribeToFirestoreNotifications,
  saveNotificationToFirestore,
  markNotificationReadInFirestore,
  deleteNotificationFromFirestore,
  clearNotificationsInFirestore,
  subscribeToFirestoreReports,
  saveReportToFirestore,
  deleteReportFromFirestore,
  subscribeToFirestoreReminders,
  saveMaintenanceReminderToFirestore,
  deleteMaintenanceReminderFromFirestore,
  subscribeToFirestoreFavorites,
  saveFavoriteToFirestore,
  deleteFavoriteFromFirestore,
  subscribeToFirestoreChatMessages,
  saveChatMessageToFirestore,
  markChatMessageReadInFirestore,
  deleteChatMessageFromFirestore,
  updateUserInFirestore,
} from '../services/firestoreService';

interface AppContextType {
  categories: ServiceCategory[];
  technicians: Technician[];
  bookings: Booking[];
  notifications: NotificationItem[];
  favorites: string[];
  comparedTechIds: string[];
  chatMessages: ChatMessage[];
  reviews: Review[];
  warranties: WarrantyClaim[];
  reports: ReportItem[];
  maintenanceReminders: MaintenanceReminder[];

  // Actions
  addCategory: (cat: Omit<ServiceCategory, 'activeProfessionals'> & { id?: string; activeProfessionals?: number }) => ServiceCategory;
  updateCategory: (categoryId: string, updates: Partial<ServiceCategory>) => void;
  deleteCategory: (categoryId: string) => void;
  createBooking: (bookingInput: Partial<Booking>) => Booking;
  updateBookingStatus: (bookingId: string, status: BookingStatus, noteEn?: string, noteBn?: string) => void;
  deleteBooking: (bookingId: string) => void;
  generateInvoice: (bookingId: string, invoiceData: Partial<Invoice>) => void;
  submitReview: (reviewInput: Omit<Review, 'id' | 'createdAt'>) => void;
  updateReview: (
    reviewId: string,
    updates: Partial<Omit<Review, 'id' | 'bookingId' | 'customerId' | 'technicianId'>>
  ) => Promise<void>;
  toggleFavorite: (technicianId: string) => void;
  isFavorite: (technicianId: string) => boolean;
  addToCompare: (technicianId: string) => boolean;
  removeFromCompare: (technicianId: string) => void;
  clearCompare: () => void;
  sendMessage: (
    bookingId: string,
    text: string,
    attachmentUrl?: string,
    senderRoleOverride?: 'CUSTOMER' | 'TECHNICIAN'
  ) => void;
  deleteChatMessage: (messageId: string) => void;
  markChatMessagesRead: (bookingId: string, readerRole: 'CUSTOMER' | 'TECHNICIAN') => void;
  getUnreadChatCount: (bookingId?: string, forRole?: 'CUSTOMER' | 'TECHNICIAN') => number;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  submitWarrantyClaim: (claim: Omit<WarrantyClaim, 'id' | 'requestDate' | 'status'>) => void;
  updateWarrantyStatus: (claimId: string, status: WarrantyClaim['status'], note?: string) => void;
  deleteWarrantyClaim: (claimId: string) => void;
  submitReport: (report: Omit<ReportItem, 'id' | 'createdAt' | 'status'>) => void;
  resolveReport: (reportId: string, resolution: string) => void;
  deleteReport: (reportId: string) => void;
  addMaintenanceReminder: (reminder: Omit<MaintenanceReminder, 'id' | 'active'>) => void;
  deleteMaintenanceReminder: (id: string) => void;
  updateTechnicianAvailability: (technicianId: string, availability: AvailabilityStatus) => void;
  verifyTechnicianField: (
    technicianId: string,
    field: 'phoneVerified' | 'nidVerified' | 'skillVerified' | 'platformVerified',
    value: boolean
  ) => void;
  techniciansHydrated: boolean;
  registerNewTechnician: (user: User, preferredTechId?: string | null) => Technician;
  updateTechnicianProfile: (technicianId: string, profileData: Partial<Technician>) => Promise<boolean>;
  deleteTechnician: (technicianId: string) => void;
  toggleBlockTechnician: (technicianId: string, blocked: boolean, reason?: string) => Promise<void>;
  adminReportTechnician: (technician: Technician, reason: string, description: string) => Promise<void>;
  addTechnicianPortfolio: (technicianId: string, item: Omit<PortfolioItem, 'id'>) => void;
  deleteTechnicianPortfolio: (technicianId: string, itemId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DUMMY_TECH_IDS = new Set(['tech-1', 'tech-2', 'tech-3', 'tech-4', 'tech-5', 'tech-6']);
const DUMMY_BOOKING_IDS = new Set([
  'book-1',
  'book-2',
  'book-3',
  'book-4',
  'book-5',
  'book-6',
  'book-7',
  'book-8',
  'book-9',
]);

const isDummyTechnician = (t: Partial<Technician>) =>
  DUMMY_TECH_IDS.has(t.id || '') ||
  (t.email || '').toLowerCase().includes('@servexa.demo') ||
  (t.userId || '').includes('demo');

const isDummyBooking = (b: Partial<Booking>) =>
  DUMMY_BOOKING_IDS.has(b.id || '') ||
  (b.id || '').startsWith('demo-') ||
  b.customerId === 'user-cust-demo' ||
  DUMMY_TECH_IDS.has(b.technicianId || '');

const isDummyNotification = (n: Partial<NotificationItem>) =>
  /^notif-[1-9]$/.test(n.id || '') ||
  n.userId === 'user-cust-demo' ||
  n.userId === 'user-admin-demo' ||
  DUMMY_TECH_IDS.has(n.userId || '');

const toServexaId = (val?: string): string => {
  if (!val) return '';
  return val.replace(/KGO-/gi, 'SRV-').replace(/কেজিও-/g, 'এসআরভি-');
};

const toServexaWarrantyId = (id: string): string => {
  if (!id) return `SRV-WRN-${String(Math.floor(100000 + Math.random() * 900000))}`;
  if (id.startsWith('SRV-WRN-')) return id;
  if (id.startsWith('war-')) {
    const digits = id.replace(/\D/g, '').slice(-6).padStart(6, '0');
    return `SRV-WRN-${digits}`;
  }
  return toServexaId(id);
};

function safeSetLocalStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors gracefully
  }
}

function safeSetTechniciansCache(list: Technician[]) {
  try {
    localStorage.setItem('kormigo_technicians', JSON.stringify(list));
  } catch {
    try {
      // Fallback: strip heavy NID & portfolio base64 blobs while preserving avatar & core profile fields
      const lightweight = list.map((t) => ({
        ...t,
        nidFrontImage: '',
        nidBackImage: '',
        portfolio: (t.portfolio || []).map((p) => ({
          ...p,
          beforeImage: '',
          afterImage: '',
        })),
      }));
      localStorage.setItem('kormigo_technicians', JSON.stringify(lightweight));
    } catch {
      // ignore storage quota errors
    }
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [techniciansHydrated, setTechniciansHydrated] = useState(false);
  const pendingTechWritesRef = useRef<number>(0);
  const autoRegisteredTechUsersRef = useRef<Set<string>>(new Set());

  const [categories, setCategories] = useState<ServiceCategory[]>(() => {
    const saved = localStorage.getItem('kormigo_categories');
    if (!saved) return initialCategories;
    try {
      const parsed: ServiceCategory[] = JSON.parse(saved);
      return parsed.map((c) => ({ ...c, activeProfessionals: 0 }));
    } catch {
      return initialCategories;
    }
  });

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    const saved = localStorage.getItem('kormigo_technicians');
    if (!saved) return [];
    try {
      const parsed: Technician[] = JSON.parse(saved);
      return parsed.filter((t) => !isDummyTechnician(t));
    } catch {
      return [];
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('kormigo_bookings');
    if (!saved) return [];
    try {
      const parsed: Booking[] = JSON.parse(saved);
      return parsed
        .filter((b) => !isDummyBooking(b))
        .map((b) => ({
          ...b,
          bookingNumber: toServexaId(b.bookingNumber),
          invoice: b.invoice
            ? { ...b.invoice, bookingNumber: toServexaId(b.invoice.bookingNumber) }
            : undefined,
        }));
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('kormigo_notifications');
    if (!saved) return [];
    try {
      const parsed: NotificationItem[] = JSON.parse(saved);
      return parsed
        .filter((n) => !isDummyNotification(n))
        .map((n) => ({
          ...n,
          titleEn: toServexaId(n.titleEn),
          titleBn: toServexaId(n.titleBn),
          messageEn: toServexaId(n.messageEn),
          messageBn: toServexaId(n.messageBn),
        }));
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('kormigo_favorites');
    if (!saved) return [];
    try {
      const parsed: string[] = JSON.parse(saved);
      return parsed.filter((id) => !DUMMY_TECH_IDS.has(id));
    } catch {
      return [];
    }
  });

  const [comparedTechIds, setComparedTechIds] = useState<string[]>([]);

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('kormigo_reviews');
    if (!saved) return [];
    try {
      const parsed: Review[] = JSON.parse(saved);
      return parsed.filter((r) => !/^rev-[1-9]$/.test(r.id) && !DUMMY_TECH_IDS.has(r.technicianId));
    } catch {
      return [];
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('kormigo_chat');
    if (!saved) return [];
    try {
      const parsed: ChatMessage[] = JSON.parse(saved);
      return parsed.filter((m) => !/^msg-[1-9]$/.test(m.id) && !DUMMY_BOOKING_IDS.has(m.bookingId));
    } catch {
      return [];
    }
  });

  const [warranties, setWarranties] = useState<WarrantyClaim[]>(() => {
    const saved = localStorage.getItem('kormigo_warranties');
    if (!saved) return [];
    try {
      const parsed: WarrantyClaim[] = JSON.parse(saved);
      return parsed
        .filter((w) => !/^war-[1-9]$/.test(w.id) && w.customerId !== 'user-cust-demo')
        .map((w) => ({
          ...w,
          id: toServexaWarrantyId(w.id),
          bookingNumber: toServexaId(w.bookingNumber),
        }));
    } catch {
      return [];
    }
  });

  const [reports, setReports] = useState<ReportItem[]>(() => {
    const saved = localStorage.getItem('kormigo_reports');
    if (!saved) return [];
    try {
      const parsed: ReportItem[] = JSON.parse(saved);
      return parsed.filter((r) => !DUMMY_BOOKING_IDS.has(r.bookingId));
    } catch {
      return [];
    }
  });

  const [maintenanceReminders, setMaintenanceReminders] = useState<MaintenanceReminder[]>(() => {
    const saved = localStorage.getItem('kormigo_reminders');
    if (!saved) return [];
    try {
      const parsed: MaintenanceReminder[] = JSON.parse(saved);
      return parsed.filter(
        (r) => !/^rem-[1-9]$/.test(r.id) && r.customerId !== 'user-cust-demo'
      );
    } catch {
      return [];
    }
  });

  const techniciansRef = useRef<Technician[]>(technicians);
  const bookingsRef = useRef<Booking[]>(bookings);
  const reviewsRef = useRef<Review[]>(reviews);

  useEffect(() => {
    techniciansRef.current = technicians;
  }, [technicians]);
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);
  useEffect(() => {
    reviewsRef.current = reviews;
  }, [reviews]);

  // Persist clean state to localStorage safely
  useEffect(() => {
    safeSetLocalStorage('kormigo_categories', categories);
  }, [categories]);
  useEffect(() => {
    safeSetTechniciansCache(technicians);
  }, [technicians]);
  useEffect(() => {
    safeSetLocalStorage('kormigo_bookings', bookings);
  }, [bookings]);
  useEffect(() => {
    safeSetLocalStorage('kormigo_notifications', notifications);
  }, [notifications]);
  useEffect(() => {
    safeSetLocalStorage('kormigo_favorites', favorites);
  }, [favorites]);
  useEffect(() => {
    safeSetLocalStorage('kormigo_reviews', reviews);
  }, [reviews]);
  useEffect(() => {
    safeSetLocalStorage('kormigo_chat', chatMessages);
  }, [chatMessages]);
  useEffect(() => {
    safeSetLocalStorage('kormigo_warranties', warranties);
  }, [warranties]);
  useEffect(() => {
    safeSetLocalStorage('kormigo_reports', reports);
  }, [reports]);
  useEffect(() => {
    safeSetLocalStorage('kormigo_reminders', maintenanceReminders);
  }, [maintenanceReminders]);

  // Real-time Firebase Firestore subscriptions across all core collections
  useEffect(() => {
    void initializeFirestoreDatabase();

    const unsubCategories = subscribeToFirestoreCategories((remoteCategories) => {
      if (remoteCategories.length > 0) {
        setCategories(remoteCategories);
      }
    });

    const unsubBookings = subscribeToFirestoreBookings((remoteBookings) => {
      setBookings(remoteBookings.filter((b) => !isDummyBooking(b)));
    });

    const unsubTechs = subscribeToFirestoreTechnicians((remoteTechs) => {
      if (pendingTechWritesRef.current > 0) return;
      const clean = remoteTechs.filter((t) => !isDummyTechnician(t));
      setTechnicians(clean);
      setTechniciansHydrated(true);
    });

    const unsubReviews = subscribeToFirestoreReviews((remoteReviews) => {
      setReviews(remoteReviews);
    });

    const unsubWarranties = subscribeToFirestoreWarranties((remoteClaims) => {
      setWarranties(remoteClaims);
    });

    const unsubNotifications = subscribeToFirestoreNotifications((remoteNotifs) => {
      setNotifications(remoteNotifs.filter((n) => !isDummyNotification(n)));
    });

    const unsubReports = subscribeToFirestoreReports((remoteReports) => {
      setReports(remoteReports);
    });

    const unsubReminders = subscribeToFirestoreReminders((remoteReminders) => {
      setMaintenanceReminders(remoteReminders);
    });

    const unsubChats = subscribeToFirestoreChatMessages((remoteChats) => {
      setChatMessages(remoteChats);
    });

    return () => {
      unsubCategories();
      unsubBookings();
      unsubTechs();
      unsubReviews();
      unsubWarranties();
      unsubNotifications();
      unsubReports();
      unsubReminders();
      unsubChats();
    };
  }, []);

  // Real-time Firestore favorites subscription for the signed-in user
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubFavs = subscribeToFirestoreFavorites(currentUser.id, (techIds) => {
      setFavorites(techIds.filter((id) => !DUMMY_TECH_IDS.has(id)));
    });
    return () => unsubFavs();
  }, [currentUser?.id]);

  const addCategory = (
    catInput: Omit<ServiceCategory, 'activeProfessionals'> & { id?: string; activeProfessionals?: number }
  ): ServiceCategory => {
    const slug = (catInput.id || catInput.nameEn || `cat-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const newCat: ServiceCategory = {
      id: slug || `cat-${Date.now()}`,
      nameEn: catInput.nameEn,
      nameBn: catInput.nameBn,
      icon: catInput.icon || 'Wrench',
      descriptionEn: catInput.descriptionEn || '',
      descriptionBn: catInput.descriptionBn || '',
      startingPrice: Number(catInput.startingPrice) || 400,
      popular: Boolean(catInput.popular),
      emergencyAvailable: Boolean(catInput.emergencyAvailable),
      activeProfessionals: catInput.activeProfessionals ?? 0,
      tags: catInput.tags || [],
    };
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === newCat.id);
      return exists ? prev.map((c) => (c.id === newCat.id ? newCat : c)) : [...prev, newCat];
    });
    void saveCategoryToFirestore(newCat);
    return newCat;
  };

  const updateCategory = (categoryId: string, updates: Partial<ServiceCategory>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, ...updates } : c))
    );
    void updateCategoryInFirestore(categoryId, updates);
  };

  const deleteCategory = (categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    void deleteCategoryFromFirestore(categoryId);
  };

  const createBooking = (input: Partial<Booking>): Booking => {
    const bookingNumber =
      input.bookingNumber ||
      `SRV-2026-${String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6)}`;
    const areaVal = input.customerArea || currentUser?.area || 'Dhaka';
    const districtVal =
      input.customerDistrict || input.customerCity || currentUser?.district || currentUser?.city || 'Dhaka';
    const addressVal = input.customerAddress || currentUser?.address || '';
    const resolvedCoords = resolveCustomerCoordinates(areaVal, addressVal, bookingNumber, districtVal);
    const estVisit = input.estimatedVisitingFee ?? 0;
    const estLabMin = input.estimatedLabourMin ?? 0;
    const estLabMax = input.estimatedLabourMax ?? 0;

    const newBooking: Booking = {
      id: input.id || `book-${Date.now()}`,
      bookingNumber,
      customerId: input.customerId || currentUser?.id || '',
      customerName: input.customerName || currentUser?.name || '',
      customerPhone: input.customerPhone || currentUser?.phone || '',
      customerDivision: input.customerDivision || currentUser?.division || 'Dhaka',
      customerDistrict: districtVal,
      customerCity: districtVal,
      customerArea: areaVal,
      customerAddress: addressVal,
      customerLat: input.customerLat ?? resolvedCoords.lat,
      customerLng: input.customerLng ?? resolvedCoords.lng,
      technicianId: input.technicianId || '',
      technicianName: input.technicianName || '',
      technicianPhone: input.technicianPhone || '',
      technicianAvatar: input.technicianAvatar || '',
      categoryId: input.categoryId || 'electrical',
      serviceNameEn: input.serviceNameEn || 'Home Service',
      serviceNameBn: input.serviceNameBn || 'হোম সার্ভিস',
      problemDescription: input.problemDescription || '',
      mediaUrls: input.mediaUrls || [],
      date: input.date || new Date().toISOString().split('T')[0],
      timeSlot: input.timeSlot || '10:00 AM - 12:00 PM',
      urgency: input.urgency || 'normal',
      estimatedVisitingFee: estVisit,
      estimatedLabourMin: estLabMin,
      estimatedLabourMax: estLabMax,
      estimatedTotalMin: input.estimatedTotalMin ?? estVisit + estLabMin,
      estimatedTotalMax: input.estimatedTotalMax ?? estVisit + estLabMax,
      finalTotal: input.finalTotal,
      status: input.status || 'REQUESTED',
      statusHistory: input.statusHistory || [
        {
          status: 'REQUESTED',
          timestamp: new Date().toISOString(),
          noteEn: 'Booking requested by customer.',
          noteBn: 'গ্রাহক বুকিং আবেদন সম্পন্ন করেছেন।',
        },
      ],
      paymentStatus: input.paymentStatus || 'PENDING',
      paymentMethod: input.paymentMethod || 'cash',
      warrantyDays: input.warrantyDays || 14,
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: input.updatedAt || new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);

    const newNotifs: NotificationItem[] = [];
    if (newBooking.customerId) {
      newNotifs.push({
        id: `notif-${Date.now()}-c`,
        userId: newBooking.customerId,
        role: 'CUSTOMER',
        titleEn: 'Booking Confirmed!',
        titleBn: 'বুকিং আবেদন সফল হয়েছে!',
        messageEn: `Your booking ${newBooking.bookingNumber} for ${newBooking.serviceNameEn} is placed.`,
        messageBn: `আপনার ${newBooking.serviceNameBn} বুকিং (${newBooking.bookingNumber}) সফলভাবে গৃহীত হয়েছে।`,
        type: 'booking',
        link: `/booking/${newBooking.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    if (newBooking.technicianId) {
      newNotifs.push({
        id: `notif-${Date.now()}-t`,
        userId: newBooking.technicianId,
        role: 'TECHNICIAN',
        titleEn: 'New Job Request Received!',
        titleBn: 'নতুন কাজের রিকোয়েস্ট এসেছে!',
        messageEn: `Booking ${newBooking.bookingNumber} in ${newBooking.customerArea}.`,
        messageBn: `${newBooking.customerArea}-তে নতুন কাজের আবেদন (${newBooking.bookingNumber})।`,
        type: 'booking',
        link: `/technician/jobs`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    newNotifs.push({
      id: `notif-${Date.now()}-a`,
      userId: 'ADMIN_BROADCAST',
      role: 'ADMIN',
      titleEn: `New Booking ${newBooking.bookingNumber}`,
      titleBn: `নতুন বুকিং: ${newBooking.bookingNumber}`,
      messageEn: `${newBooking.customerName} booked ${newBooking.technicianName} (${newBooking.serviceNameEn}).`,
      messageBn: `${newBooking.customerName} ${newBooking.technicianName}-কে ${newBooking.serviceNameBn} কাজের জন্য বুক করেছেন।`,
      type: 'booking',
      link: `/admin/dashboard`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    setNotifications((prev) => [...newNotifs, ...prev]);
    newNotifs.forEach((n) => void saveNotificationToFirestore(n));
    void saveBookingToFirestore(newBooking);

    return newBooking;
  };

  const updateBookingStatus = (
    bookingId: string,
    status: BookingStatus,
    noteEn?: string,
    noteBn?: string
  ) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    const statusLabels: Record<BookingStatus, { en: string; bn: string }> = {
      REQUESTED: { en: 'Requested', bn: 'অনুরোধকৃত' },
      ACCEPTED: { en: 'Accepted', bn: 'গৃহীত হয়েছে' },
      ON_THE_WAY: { en: 'Technician On The Way', bn: 'টেকনিশিয়ান রওনা হয়েছেন' },
      ARRIVED: { en: 'Technician Arrived', bn: 'টেকনিশিয়ান পৌঁছে গেছেন' },
      IN_PROGRESS: { en: 'Work In Progress', bn: 'কাজ চলছে' },
      COMPLETED: { en: 'Completed', bn: 'সম্পন্ন হয়েছে' },
      CANCELLED: { en: 'Cancelled', bn: 'বাতিল হয়েছে' },
      DISPUTED: { en: 'Disputed', bn: 'অভিযোগ পর্যালোচনাধীন' },
    };
    const label = statusLabels[status] || { en: status, bn: status };

    const historyItem = {
      status,
      timestamp: new Date().toISOString(),
      noteEn: noteEn || `Status updated to ${label.en}`,
      noteBn: noteBn || `স্ট্যাটাস পরিবর্তন: ${label.bn}`,
    };
    const nextHistory = targetBooking ? [...targetBooking.statusHistory, historyItem] : [historyItem];
    const updatedAt = new Date().toISOString();

    setBookings((prev) =>
      prev.map((b) =>
        b.id !== bookingId
          ? b
          : {
              ...b,
              status,
              statusHistory: [...b.statusHistory, historyItem],
              updatedAt,
            }
      )
    );

    void updateBookingInFirestore(bookingId, {
      status,
      statusHistory: nextHistory,
      updatedAt,
    });

    const outNotifs: NotificationItem[] = [];
    const nowIso = new Date().toISOString();

    if (targetBooking?.customerId) {
      outNotifs.push({
        id: `notif-bk-cust-${Date.now()}`,
        userId: targetBooking.customerId,
        role: 'CUSTOMER',
        titleEn: `Booking #${targetBooking.bookingNumber}: ${label.en}`,
        titleBn: `বুকিং #${targetBooking.bookingNumber}: ${label.bn}`,
        messageEn: noteEn || `Your booking status changed to ${label.en}.`,
        messageBn: noteBn || `আপনার বুকিং স্ট্যাটাস পরিবর্তিত হয়ে "${label.bn}" হয়েছে।`,
        type: 'booking',
        link: `/booking/${bookingId}`,
        isRead: false,
        createdAt: nowIso,
      });
    }

    if (targetBooking && (status === 'ACCEPTED' || status === 'COMPLETED' || status === 'CANCELLED')) {
      outNotifs.push({
        id: `notif-bk-adm-${Date.now() + 1}`,
        userId: 'ADMIN_BROADCAST',
        role: 'ADMIN',
        titleEn: `Booking #${targetBooking.bookingNumber} ${label.en}`,
        titleBn: `বুকিং #${targetBooking.bookingNumber} — ${label.bn}`,
        messageEn: `${targetBooking.technicianName} updated booking #${targetBooking.bookingNumber} (${targetBooking.customerName}) to ${label.en}.`,
        messageBn: `${targetBooking.technicianName} বুকিং #${targetBooking.bookingNumber} (${targetBooking.customerName}) আপডেট করে "${label.bn}" করেছেন।`,
        type: 'booking',
        link: '/admin/dashboard',
        isRead: false,
        createdAt: nowIso,
      });
    }

    if (outNotifs.length > 0) {
      setNotifications((prev) => [...outNotifs, ...prev]);
      outNotifs.forEach((n) => void saveNotificationToFirestore(n));
    }

    if (getStoredAuthToken()) {
      void updateServerBookingStatus(bookingId, status, noteEn, noteBn).catch(() => {});
    }
  };

  const generateInvoice = (bookingId: string, invoiceData: Partial<Invoice>) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const visitingFee = invoiceData.visitingFee ?? booking.estimatedVisitingFee;
    const labourCost = invoiceData.labourCost ?? 0;
    const partsCost = invoiceData.partsCost ?? 0;
    const discount = invoiceData.discount ?? 0;
    const subtotal = visitingFee + labourCost + partsCost;
    const total = Math.max(0, subtotal - discount);

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6)}`,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      technicianName: booking.technicianName,
      technicianPhone: booking.technicianPhone,
      serviceName: booking.serviceNameBn,
      issueDate: new Date().toISOString().split('T')[0],
      visitingFee,
      labourCost,
      partsCost,
      discount,
      subtotal,
      total,
      paymentMethod: invoiceData.paymentMethod || 'cash',
      paymentStatus: invoiceData.paymentStatus || 'PAID',
      paidAt: new Date().toISOString(),
    };

    const nowIso = new Date().toISOString();

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              invoice,
              finalTotal: total,
              paymentStatus: invoice.paymentStatus,
              status: 'COMPLETED',
            }
          : b
      )
    );

    void updateBookingInFirestore(bookingId, {
      invoice,
      finalTotal: total,
      paymentStatus: invoice.paymentStatus,
      status: 'COMPLETED',
      updatedAt: nowIso,
    });

    const outNotifs: NotificationItem[] = [];
    if (booking.customerId) {
      outNotifs.push({
        id: `notif-inv-cust-${Date.now()}`,
        userId: booking.customerId,
        role: 'CUSTOMER',
        titleEn: `Invoice ${invoice.invoiceNumber} Issued`,
        titleBn: `ইনভয়েস ${invoice.invoiceNumber} তৈরি হয়েছে`,
        messageEn: `${booking.technicianName} completed your service and generated invoice ${invoice.invoiceNumber} (৳${total}).`,
        messageBn: `${booking.technicianName} আপনার সার্ভিস সম্পন্ন করে ৳${total} টাকার ইনভয়েস (${invoice.invoiceNumber}) তৈরি করেছেন। পেমেন্ট সম্পন্ন করুন।`,
        type: 'payment',
        link: `/booking/${bookingId}`,
        isRead: false,
        createdAt: nowIso,
      });
    }

    outNotifs.push({
      id: `notif-inv-adm-${Date.now() + 1}`,
      userId: 'ADMIN_BROADCAST',
      role: 'ADMIN',
      titleEn: `Job Completed & Invoice Generated`,
      titleBn: `কাজ সম্পন্ন ও ইনভয়েস তৈরি (${invoice.invoiceNumber})`,
      messageEn: `${booking.technicianName} completed #${booking.bookingNumber} for ${booking.customerName} — Total ৳${total} (${invoice.paymentMethod}).`,
      messageBn: `${booking.technicianName} বুকিং #${booking.bookingNumber} সম্পন্ন করে ৳${total} ইনভয়েস (${invoice.paymentMethod}) তৈরি করেছেন।`,
      type: 'payment',
      link: '/admin/dashboard',
      isRead: false,
      createdAt: nowIso,
    });

    setNotifications((prev) => [...outNotifs, ...prev]);
    outNotifs.forEach((n) => void saveNotificationToFirestore(n));
  };

  const submitReview = (reviewInput: Omit<Review, 'id' | 'createdAt'>) => {
    const newReview: Review = {
      ...reviewInput,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setReviews((prev) => [newReview, ...prev]);
    void saveReviewToFirestore(newReview);

    setBookings((prev) =>
      prev.map((b) => (b.id === reviewInput.bookingId ? { ...b, reviewed: true } : b))
    );
    void updateBookingInFirestore(reviewInput.bookingId, { reviewed: true });

    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id !== reviewInput.technicianId) return t;
        const currentCount = t.reviewCount;
        const newRating = Number(
          ((t.rating * currentCount + reviewInput.overallRating) / (currentCount + 1)).toFixed(1)
        );
        const updatedTech: Technician = {
          ...t,
          rating: newRating,
          reviewCount: currentCount + 1,
          completedJobs: t.completedJobs + 1,
          healthScore: {
            ...t.healthScore,
            reviewScore: newRating,
            completedJobs: t.completedJobs + 1,
          },
        };
        void saveTechnicianToFirestore(updatedTech);
        return updatedTech;
      })
    );

    if (reviewInput.technicianId) {
      const reviewNotif: NotificationItem = {
        id: `notif-rev-${Date.now()}`,
        userId: reviewInput.technicianId,
        role: 'TECHNICIAN',
        titleEn: `New ${reviewInput.overallRating}★ Customer Feedback!`,
        titleBn: `⭐ নতুন গ্রাহক ফিডব্যাক (${reviewInput.overallRating}★)!`,
        messageEn: `${reviewInput.customerName} left feedback for ${reviewInput.serviceName}: "${reviewInput.comment.slice(0, 60)}"`,
        messageBn: `${reviewInput.customerName} আপনার "${reviewInput.serviceName}" কাজের ওপর ${reviewInput.overallRating}★ ফিডব্যাক দিয়েছেন।`,
        type: 'system',
        link: '/technician/dashboard',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [reviewNotif, ...prev]);
      void saveNotificationToFirestore(reviewNotif);
    }
  };

  const updateReview = async (
    reviewId: string,
    updates: Partial<Omit<Review, 'id' | 'bookingId' | 'customerId' | 'technicianId'>>
  ) => {
    const existing = reviewsRef.current.find((r) => r.id === reviewId);
    if (!existing) return;

    const updatedAt = new Date().toISOString();
    const updatedReview: Review = {
      ...existing,
      ...updates,
      isEdited: true,
      updatedAt,
    };

    const nextReviews = reviewsRef.current.map((r) =>
      r.id === reviewId ? updatedReview : r
    );
    reviewsRef.current = nextReviews;
    setReviews(nextReviews);

    await saveReviewToFirestore(updatedReview);

    // Recalculate technician rating accurately and sync to Firestore & server
    const techReviews = nextReviews.filter((r) => r.technicianId === existing.technicianId);
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id !== existing.technicianId) return t;
        let newRating = t.rating;
        if (techReviews.length > 0 && t.reviewCount <= techReviews.length) {
          const sum = techReviews.reduce((acc, r) => acc + Number(r.overallRating || 0), 0);
          newRating = Number((sum / techReviews.length).toFixed(1));
        } else {
          const count = Math.max(1, t.reviewCount);
          const adjusted =
            t.rating * count - Number(existing.overallRating || 0) + Number(updatedReview.overallRating || 0);
          newRating = Number(Math.max(1, Math.min(5, adjusted / count)).toFixed(1));
        }
        const updatedTech: Technician = {
          ...t,
          rating: newRating,
          reviewCount: Math.max(t.reviewCount, techReviews.length),
          healthScore: {
            ...t.healthScore,
            reviewScore: newRating,
          },
        };
        void saveTechnicianToFirestore(updatedTech);
        void syncTechnicianToServer(updatedTech).catch(() => {});
        return updatedTech;
      })
    );

    if (existing.technicianId) {
      const editNotif: NotificationItem = {
        id: `notif-rev-edit-${Date.now()}`,
        userId: existing.technicianId,
        role: 'TECHNICIAN',
        titleEn: `Customer Updated Feedback (${updatedReview.overallRating}★)`,
        titleBn: `✏️ গ্রাহক তার ফিডব্যাক আপডেট করেছেন (${updatedReview.overallRating}★)`,
        messageEn: `${updatedReview.customerName} updated their review for ${updatedReview.serviceName}: "${(updatedReview.comment || '').slice(0, 60)}"`,
        messageBn: `${updatedReview.customerName} "${updatedReview.serviceName}" কাজের ফিডব্যাক আপডেট করেছেন।`,
        type: 'system',
        link: '/technician/dashboard?tab=reviews',
        isRead: false,
        createdAt: updatedAt,
      };
      setNotifications((prev) => [editNotif, ...prev]);
      void saveNotificationToFirestore(editNotif);
    }
  };

  const toggleFavorite = (technicianId: string) => {
    const currentlyFav = favorites.includes(technicianId);
    setFavorites((prev) =>
      currentlyFav ? prev.filter((id) => id !== technicianId) : [...prev, technicianId]
    );
    if (currentUser?.id) {
      if (currentlyFav) {
        void deleteFavoriteFromFirestore(currentUser.id, technicianId);
      } else {
        void saveFavoriteToFirestore(currentUser.id, technicianId);
      }
    }
  };

  const deleteBooking = (bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    void deleteBookingFromFirestore(bookingId);
  };

  const isFavorite = (technicianId: string) => favorites.includes(technicianId);

  const addToCompare = (technicianId: string) => {
    if (comparedTechIds.includes(technicianId)) return true;
    if (comparedTechIds.length >= 5) return false;
    setComparedTechIds((prev) => [...prev, technicianId]);
    return true;
  };

  const removeFromCompare = (technicianId: string) => {
    setComparedTechIds((prev) => prev.filter((id) => id !== technicianId));
  };

  const clearCompare = () => {
    setComparedTechIds([]);
  };

  const sendMessage = (
    bookingId: string,
    text: string,
    attachmentUrl?: string,
    senderRoleOverride?: 'CUSTOMER' | 'TECHNICIAN'
  ) => {
    const booking = bookings.find((b) => b.id === bookingId);
    const activeRole =
      senderRoleOverride || (currentUser?.role === 'TECHNICIAN' ? 'TECHNICIAN' : 'CUSTOMER');

    const isCustomer = activeRole === 'CUSTOMER';
    const senderId = isCustomer
      ? currentUser?.role === 'CUSTOMER'
        ? currentUser.id
        : booking?.customerId || ''
      : currentUser?.role === 'TECHNICIAN'
      ? currentUser.id
      : booking?.technicianId || '';
    const senderName = isCustomer
      ? currentUser?.role === 'CUSTOMER'
        ? currentUser.name
        : booking?.customerName || 'গ্রাহক'
      : currentUser?.role === 'TECHNICIAN'
      ? currentUser.name
      : booking?.technicianName || 'টেকনিশিয়ান';

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      bookingId,
      senderId,
      senderRole: isCustomer ? 'CUSTOMER' : 'TECHNICIAN',
      senderName,
      message: text,
      attachmentUrl,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    void saveChatMessageToFirestore(newMsg);

    if (isCustomer && booking?.technicianId) {
      const techNotif: NotificationItem = {
        id: `notif-chat-${Date.now()}`,
        userId: booking.technicianId,
        role: 'TECHNICIAN',
        titleEn: `New message from ${senderName}`,
        titleBn: `${senderName} (গ্রাহক) নতুন মেসেজ দিয়েছেন`,
        messageEn: `"${text.length > 50 ? text.slice(0, 50) + '...' : text}"`,
        messageBn: `"${text.length > 50 ? text.slice(0, 50) + '...' : text}"`,
        type: 'message',
        link: `/technician/dashboard`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [techNotif, ...prev]);
      void saveNotificationToFirestore(techNotif);
    } else if (!isCustomer && booking?.customerId) {
      const custNotif: NotificationItem = {
        id: `notif-chat-${Date.now()}`,
        userId: booking.customerId,
        role: 'CUSTOMER',
        titleEn: `New message from ${senderName}`,
        titleBn: `${senderName} (মিস্ত্রি) মেসেজের উত্তর দিয়েছেন`,
        messageEn: `"${text.length > 50 ? text.slice(0, 50) + '...' : text}"`,
        messageBn: `"${text.length > 50 ? text.slice(0, 50) + '...' : text}"`,
        type: 'message',
        link: `/booking/${bookingId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [custNotif, ...prev]);
      void saveNotificationToFirestore(custNotif);
    }
  };

  const markChatMessagesRead = (bookingId: string, readerRole: 'CUSTOMER' | 'TECHNICIAN') => {
    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.bookingId !== bookingId) return msg;
        if (readerRole === 'CUSTOMER' && msg.senderRole === 'TECHNICIAN' && !msg.isRead) {
          void markChatMessageReadInFirestore(msg.id);
          return { ...msg, isRead: true };
        }
        if (readerRole === 'TECHNICIAN' && msg.senderRole === 'CUSTOMER' && !msg.isRead) {
          void markChatMessageReadInFirestore(msg.id);
          return { ...msg, isRead: true };
        }
        return msg;
      })
    );
  };

  const getUnreadChatCount = (bookingId?: string, forRole?: 'CUSTOMER' | 'TECHNICIAN') => {
    const roleToCheck = forRole || (currentUser?.role === 'TECHNICIAN' ? 'TECHNICIAN' : 'CUSTOMER');
    return chatMessages.filter((msg) => {
      if (bookingId && msg.bookingId !== bookingId) return false;
      if (roleToCheck === 'TECHNICIAN') {
        return msg.senderRole === 'CUSTOMER' && !msg.isRead;
      } else {
        return msg.senderRole === 'TECHNICIAN' && !msg.isRead;
      }
    }).length;
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    void markNotificationReadInFirestore(notificationId);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (!n.isRead && (!currentUser || n.role === currentUser.role)) {
          void markNotificationReadInFirestore(n.id);
          return { ...n, isRead: true };
        }
        return n;
      })
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    void deleteNotificationFromFirestore(notificationId);
  };

  const clearAllNotifications = () => {
    const targetIds = notifications
      .filter((n) => {
        if (!currentUser) return true;
        if (currentUser.role === 'ADMIN') return n.role === 'ADMIN';
        return n.role === currentUser.role && n.userId === currentUser.id;
      })
      .map((n) => n.id);
    if (targetIds.length === 0) return;
    const idSet = new Set(targetIds);
    setNotifications((prev) => prev.filter((n) => !idSet.has(n.id)));
    void clearNotificationsInFirestore(targetIds);
  };

  const deleteChatMessage = (messageId: string) => {
    setChatMessages((prev) => prev.filter((m) => m.id !== messageId));
    void deleteChatMessageFromFirestore(messageId);
  };

  const deleteWarrantyClaim = (claimId: string) => {
    setWarranties((prev) => prev.filter((w) => w.id !== claimId));
    void deleteWarrantyFromFirestore(claimId);
  };

  const deleteReport = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    void deleteReportFromFirestore(reportId);
  };

  const submitWarrantyClaim = (claim: Omit<WarrantyClaim, 'id' | 'requestDate' | 'status'>) => {
    const relatedBooking = bookings.find((b) => b.id === claim.bookingId);
    const targetTechId = claim.technicianId || relatedBooking?.technicianId || '';
    const relatedTech = technicians.find((t) => t.id === targetTechId);

    const areaVal = claim.customerArea || relatedBooking?.customerArea || currentUser?.area || 'Dhaka';
    const addressVal =
      claim.customerAddress || relatedBooking?.customerAddress || currentUser?.address || 'Dhaka';
    const resolvedCoords = resolveCustomerCoordinates(areaVal, addressVal, claim.bookingNumber);

    const newClaim: WarrantyClaim = {
      ...claim,
      id: `SRV-WRN-${String(Math.floor(100000 + Math.random() * 900000))}`,
      bookingNumber: toServexaId(claim.bookingNumber),
      technicianId: targetTechId,
      technicianName:
        claim.technicianName || relatedBooking?.technicianName || relatedTech?.name || 'টেকনিশিয়ান',
      technicianPhone:
        claim.technicianPhone || relatedBooking?.technicianPhone || relatedTech?.phone || '',
      customerName:
        claim.customerName || relatedBooking?.customerName || currentUser?.name || 'গ্রাহক',
      customerPhone:
        claim.customerPhone || relatedBooking?.customerPhone || currentUser?.phone || '',
      customerArea: areaVal,
      customerAddress: addressVal,
      customerLat: claim.customerLat ?? relatedBooking?.customerLat ?? resolvedCoords.lat,
      customerLng: claim.customerLng ?? relatedBooking?.customerLng ?? resolvedCoords.lng,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'REQUESTED',
    };

    setWarranties((prev) => [newClaim, ...prev]);
    void saveWarrantyToFirestore(newClaim);

    setBookings((prev) =>
      prev.map((b) => (b.id === claim.bookingId ? { ...b, warrantyRequested: true } : b))
    );
    void updateBookingInFirestore(claim.bookingId, { warrantyRequested: true });

    const adminNotif: NotificationItem = {
      id: `notif-war-admin-${Date.now()}`,
      userId: 'ADMIN_BROADCAST',
      role: 'ADMIN',
      titleEn: `New Warranty Claim #${newClaim.id}`,
      titleBn: `🛡️ নতুন ওয়ারেন্টি ক্লেইম আবেদন (#${newClaim.id})`,
      messageEn: `${newClaim.customerName} submitted a warranty claim for ${newClaim.serviceName} (${newClaim.bookingNumber}, Tech: ${newClaim.technicianName}).`,
      messageBn: `${newClaim.customerName} (${newClaim.technicianName}-এর ${newClaim.bookingNumber} কাজের ওপর) ফ্রি ওয়ারেন্টি ক্লেইম করেছেন। অ্যাডমিন অনুমোদন প্রয়োজন।`,
      type: 'warranty',
      link: '/admin/dashboard',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [adminNotif, ...prev]);
    void saveNotificationToFirestore(adminNotif);
  };

  const updateWarrantyStatus = (
    claimId: string,
    status: WarrantyClaim['status'],
    note?: string
  ) => {
    const targetClaim = warranties.find((w) => w.id === claimId);
    const today = new Date().toISOString().split('T')[0];

    setWarranties((prev) =>
      prev.map((w) => {
        if (w.id !== claimId) return w;
        const isAdminAction = status === 'APPROVED' || status === 'REJECTED';
        const isTechAction = status === 'ACCEPTED' || status === 'ON_THE_WAY' || status === 'RESOLVED';

        const updated: WarrantyClaim = {
          ...w,
          status,
          adminNote: isAdminAction ? note || w.adminNote : w.adminNote,
          technicianNote: isTechAction ? note || w.technicianNote : w.technicianNote,
          approvedDate: status === 'APPROVED' ? today : w.approvedDate,
          acceptedAt: status === 'ACCEPTED' ? new Date().toISOString() : w.acceptedAt,
          resolvedDate: status === 'RESOLVED' ? today : w.resolvedDate,
        };
        void saveWarrantyToFirestore(updated);
        return updated;
      })
    );

    if (!targetClaim) return;

    const newNotifications: NotificationItem[] = [];
    const ts = Date.now();

    if (status === 'APPROVED') {
      if (targetClaim.technicianId) {
        newNotifications.push({
          id: `notif-war-tech-${ts}`,
          userId: targetClaim.technicianId,
          role: 'TECHNICIAN',
          titleEn: `Approved Warranty Job #${targetClaim.id}`,
          titleBn: `🛡️ অনুমোদিত ওয়ারেন্টি ক্লেইম (#${targetClaim.id})`,
          messageEn: `Admin approved warranty claim #${targetClaim.id} (${targetClaim.bookingNumber}) for ${targetClaim.serviceName} and assigned it to you.`,
          messageBn: `অ্যাডমিন "${targetClaim.serviceName}"-এর ওয়ারেন্টি ক্লেইম (#${targetClaim.id}) অনুমোদন করে সরাসরি আপনার ড্যাশবোর্ডে পাঠিয়েছেন। অনুগ্রহ করে পিক করুন।`,
          type: 'warranty',
          link: '/technician/dashboard',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      if (targetClaim.customerId) {
        newNotifications.push({
          id: `notif-war-cust-${ts + 1}`,
          userId: targetClaim.customerId,
          role: 'CUSTOMER',
          titleEn: `Warranty Claim Approved`,
          titleBn: `✅ আপনার ওয়ারেন্টি ক্লেইম অনুমোদিত হয়েছে`,
          messageEn: `Admin approved claim #${targetClaim.id} (${targetClaim.bookingNumber}) and dispatched it to ${targetClaim.technicianName || 'your technician'}.`,
          messageBn: `অ্যাডমিন আপনার ওয়ারেন্টি ক্লেইম (#${targetClaim.id}) অনুমোদন করে টেকনিশিয়ান ${targetClaim.technicianName || ''}-এর কাছে পাঠিয়েছেন।`,
          type: 'warranty',
          link: '/customer/dashboard',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (status === 'REJECTED' && targetClaim.customerId) {
      newNotifications.push({
        id: `notif-war-rej-${ts}`,
        userId: targetClaim.customerId,
        role: 'CUSTOMER',
        titleEn: `Warranty Claim Update`,
        titleBn: `ওয়ারেন্টি ক্লেইম পর্যালোচনা সম্পন্ন`,
        messageEn: note || `Warranty claim #${targetClaim.id} was not eligible.`,
        messageBn: note || `ওয়ারেন্টি ক্লেইম (#${targetClaim.id}) অনুমোদিত হয়নি।`,
        type: 'warranty',
        link: '/customer/dashboard',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } else if (status === 'ACCEPTED' && targetClaim.customerId) {
      newNotifications.push({
        id: `notif-war-acc-${ts}`,
        userId: targetClaim.customerId,
        role: 'CUSTOMER',
        titleEn: `Technician Picked Warranty Claim`,
        titleBn: `🔧 টেকনিশিয়ান ওয়ারেন্টি কাজ পিক করেছেন`,
        messageEn: `${targetClaim.technicianName || 'Technician'} accepted your warranty service #${targetClaim.id}.`,
        messageBn: `${targetClaim.technicianName || 'টেকনিশিয়ান'} আপনার ফ্রি ওয়ারেন্টি কাজ (#${targetClaim.id}) পিক করেছেন।`,
        type: 'warranty',
        link: '/customer/dashboard',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } else if (status === 'ON_THE_WAY' && targetClaim.customerId) {
      newNotifications.push({
        id: `notif-war-way-${ts}`,
        userId: targetClaim.customerId,
        role: 'CUSTOMER',
        titleEn: `Technician On The Way (Warranty)`,
        titleBn: `🚚 ওয়ারেন্টি সার্ভিসের জন্য টেকনিশিয়ান রওনা হয়েছেন`,
        messageEn: `${targetClaim.technicianName || 'Technician'} is heading to ${targetClaim.customerAddress || 'your location'} for free warranty service (#${targetClaim.id}).`,
        messageBn: `${targetClaim.technicianName || 'টেকনিশিয়ান'} ফ্রি ওয়ারেন্টি সার্ভিস (#${targetClaim.id}) দিতে আপনার ঠিকানায় রওনা হয়েছেন।`,
        type: 'warranty',
        link: '/customer/dashboard',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } else if (status === 'RESOLVED') {
      if (targetClaim.customerId) {
        newNotifications.push({
          id: `notif-war-res-c-${ts}`,
          userId: targetClaim.customerId,
          role: 'CUSTOMER',
          titleEn: `Warranty Service Resolved!`,
          titleBn: `✅ ওয়ারেন্টি সার্ভিস সম্পন্ন হয়েছে!`,
          messageEn: `Warranty repair #${targetClaim.id} for ${targetClaim.serviceName} is completed. Please share your feedback.`,
          messageBn: `"${targetClaim.serviceName}"-এর ফ্রি ওয়ারেন্টি সার্ভিস (#${targetClaim.id}) সম্পন্ন হয়েছে। অনুগ্রহ করে আপনার ফিডব্যাক জানান।`,
          type: 'warranty',
          link: '/customer/dashboard',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
      newNotifications.push({
        id: `notif-war-res-a-${ts + 1}`,
        userId: 'ADMIN_BROADCAST',
        role: 'ADMIN',
        titleEn: `Warranty Claim Resolved (#${targetClaim.id})`,
        titleBn: `✔️ ওয়ারেন্টি ক্লেইম সম্পন্ন (#${targetClaim.id})`,
        messageEn: `${targetClaim.technicianName || 'Technician'} completed warranty service for ${targetClaim.customerName || 'customer'}.`,
        messageBn: `${targetClaim.technicianName || 'টেকনিশিয়ান'} সফলভাবে ওয়ারেন্টি সার্ভিস (#${targetClaim.id}) সম্পন্ন করেছেন।`,
        type: 'warranty',
        link: '/admin/dashboard',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
      newNotifications.forEach((n) => void saveNotificationToFirestore(n));
    }
  };

  const submitReport = (report: Omit<ReportItem, 'id' | 'createdAt' | 'status'>) => {
    const newReport: ReportItem = {
      ...report,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'OPEN',
    };
    setReports((prev) => [newReport, ...prev]);
    void saveReportToFirestore(newReport);

    setBookings((prev) =>
      prev.map((b) => (b.id === report.bookingId ? { ...b, status: 'DISPUTED' } : b))
    );
    void updateBookingInFirestore(report.bookingId, {
      status: 'DISPUTED',
      updatedAt: new Date().toISOString(),
    });

    const adminNotif: NotificationItem = {
      id: `notif-rep-${Date.now()}`,
      userId: 'ADMIN_BROADCAST',
      role: 'ADMIN',
      titleEn: `New Dispute Report`,
      titleBn: `⚠️ নতুন রিপোর্ট / অভিযোগ জমা হয়েছে`,
      messageEn: `${report.reason}: ${(report.description || '').slice(0, 80)}`,
      messageBn: `${report.reason}: ${(report.description || '').slice(0, 80)}`,
      type: 'system',
      link: '/admin/dashboard',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [adminNotif, ...prev]);
    void saveNotificationToFirestore(adminNotif);
  };

  const resolveReport = (reportId: string, resolution: string) => {
    const targetReport = reports.find((r) => r.id === reportId);
    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;
        const updated: ReportItem = { ...r, status: 'RESOLVED', adminResolution: resolution };
        void saveReportToFirestore(updated);
        return updated;
      })
    );

    if (targetReport) {
      const nowIso = new Date().toISOString();
      const outNotifs: NotificationItem[] = [];

      if (targetReport.reporterId) {
        outNotifs.push({
          id: `notif-rep-res-r-${Date.now()}`,
          userId: targetReport.reporterId,
          role: targetReport.reporterRole,
          titleEn: `Dispute Report Resolved`,
          titleBn: `অভিযোগের সমাধান দিয়েছেন অ্যাডমিন`,
          messageEn: `Admin resolved your report (${targetReport.reason}): ${resolution}`,
          messageBn: `অ্যাডমিন আপনার "${targetReport.reason}" অভিযোগটি নিষ্পত্তি করেছেন: ${resolution}`,
          type: 'system',
          link: targetReport.reporterRole === 'TECHNICIAN' ? '/technician/dashboard' : `/booking/${targetReport.bookingId}`,
          isRead: false,
          createdAt: nowIso,
        });
      }

      if (targetReport.targetId && targetReport.targetId !== targetReport.reporterId) {
        outNotifs.push({
          id: `notif-rep-res-t-${Date.now() + 1}`,
          userId: targetReport.targetId,
          role: targetReport.targetRole,
          titleEn: `Dispute Review Closed by Admin`,
          titleBn: `অ্যাডমিন অভিযোগ পর্যালোচনা সম্পন্ন করেছেন`,
          messageEn: `Admin recorded resolution for booking #${targetReport.bookingId}: ${resolution}`,
          messageBn: `বুকিং সংক্রান্ত অভিযোগটির ব্যাপারে অ্যাডমিন সিদ্ধান্ত জানিয়েছেন: ${resolution}`,
          type: 'system',
          link: targetReport.targetRole === 'TECHNICIAN' ? '/technician/dashboard' : `/booking/${targetReport.bookingId}`,
          isRead: false,
          createdAt: nowIso,
        });
      }

      if (outNotifs.length > 0) {
        setNotifications((prev) => [...outNotifs, ...prev]);
        outNotifs.forEach((n) => void saveNotificationToFirestore(n));
      }
    }
  };

  const addMaintenanceReminder = (reminder: Omit<MaintenanceReminder, 'id' | 'active'>) => {
    const newRem: MaintenanceReminder = {
      ...reminder,
      id: `rem-${Date.now()}`,
      active: true,
    };
    setMaintenanceReminders((prev) => [newRem, ...prev]);
    void saveMaintenanceReminderToFirestore(newRem);
  };

  const deleteMaintenanceReminder = (id: string) => {
    setMaintenanceReminders((prev) => prev.filter((r) => r.id !== id));
    void deleteMaintenanceReminderFromFirestore(id);
  };

  const updateTechnicianAvailability = (
    technicianId: string,
    availability: AvailabilityStatus
  ) => {
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id !== technicianId) return t;
        const updated = { ...t, availability };
        void saveTechnicianToFirestore(updated);
        void syncTechnicianToServer(updated).catch(() => {});
        return updated;
      })
    );
  };

  const registerNewTechnician = (user: User, preferredTechId?: string | null): Technician => {
    const existing = technicians.find(
      (t) =>
        t.userId === user.id ||
        (user.email && t.email && t.email.toLowerCase() === user.email.toLowerCase())
    );
    if (existing) {
      void syncTechnicianToServer(existing).catch(() => {});
      return existing;
    }

    const newTech: Technician = {
      id: preferredTechId || `tech-${Date.now()}`,
      userId: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
      bioEn: '',
      bioBn: '',
      rating: 5.0,
      reviewCount: 0,
      completedJobs: 0,
      responseRate: 100,
      startingPrice: 0,
      visitingFee: 0,
      experienceYears: 0,
      phone: user.phone || '',
      division: '',
      district: '',
      city: '',
      primaryArea: '',
      serviceAreas: [],
      skills: [],
      languages: ['বাংলা'],
      availability: 'offline',
      workingHours: '',
      phoneVerified: !!user.phone,
      nidVerified: false,
      skillVerified: false,
      platformVerified: false,
      nidFrontImage: '',
      nidBackImage: '',
      featured: false,
      warrantyPeriodDays: 7,
      healthScore: {
        responseRate: 100,
        onTimeRate: 100,
        repeatRate: 100,
        completedJobs: 0,
        reviewScore: 5.0,
      },
      portfolio: [],
      aboutEn: '',
      aboutBn: '',
      emergencyAvailable: false,
      serviceRadiusKm: 10,
    };

    setTechnicians((prev) => [newTech, ...prev]);
    void saveTechnicianToFirestore(newTech);
    void syncTechnicianToServer(newTech).catch(() => {});

    const adminNotif: NotificationItem = {
      id: `notif-newtech-${Date.now()}`,
      userId: 'ADMIN_BROADCAST',
      role: 'ADMIN',
      titleEn: `New Technician Registered: ${user.name}`,
      titleBn: `👷 নতুন টেকনিশিয়ান নিবন্ধন করেছেন: ${user.name}`,
      messageEn: `${user.name} (${user.email}) registered as a technician. Review their biodata, NID & skill test in Admin KYC.`,
      messageBn: `${user.name} (${user.email}) নতুন টেকনিশিয়ান হিসেবে সাইন আপ করেছেন। প্রোফাইল, NID ও "দক্ষতা উত্তীর্ণ" যাচাই করতে অ্যাডমিন ড্যাশবোর্ড দেখুন।`,
      type: 'system',
      link: '/admin/dashboard',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [adminNotif, ...prev]);
    void saveNotificationToFirestore(adminNotif);

    return newTech;
  };

  useEffect(() => {
    if (!techniciansHydrated || !currentUser || currentUser.role !== 'TECHNICIAN') return;
    if (autoRegisteredTechUsersRef.current.has(currentUser.id)) return;
    const exists = technicians.some(
      (t) =>
        t.userId === currentUser.id ||
        (currentUser.email && t.email && t.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    autoRegisteredTechUsersRef.current.add(currentUser.id);
    if (!exists) {
      registerNewTechnician(currentUser, null);
    }
  }, [techniciansHydrated, currentUser?.id, currentUser?.role, technicians]);

  const verifyTechnicianField = (
    technicianId: string,
    field: 'phoneVerified' | 'nidVerified' | 'skillVerified' | 'platformVerified',
    value: boolean
  ) => {
    const targetTech = technicians.find((t) => t.id === technicianId);
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id === technicianId) {
          const updated = { ...t, [field]: value };
          void saveTechnicianToFirestore(updated);
          void syncTechnicianToServer(updated).catch(() => {});
          return updated;
        }
        return t;
      })
    );

    if (targetTech) {
      const labelMap: Record<typeof field, { en: string; bn: string }> = {
        phoneVerified: { en: 'Phone Verification', bn: 'ফোন ভেরিফিকেশন' },
        nidVerified: { en: 'NID Verification', bn: 'NID ভেরিফিকেশন' },
        skillVerified: { en: 'Skill Pass Approval', bn: 'দক্ষতা উত্তীর্ণ অনুমোদন' },
        platformVerified: { en: 'Verified Pro Badge', bn: 'ভেরিফায়েড প্রো ব্যাজ' },
      };
      const label = labelMap[field];
      const techNotif: NotificationItem = {
        id: `notif-kyc-${Date.now()}`,
        userId: targetTech.id,
        role: 'TECHNICIAN',
        titleEn: value ? `${label.en} Approved` : `${label.en} Updated`,
        titleBn: value
          ? field === 'skillVerified'
            ? 'অভিনন্দন! আপনি "দক্ষতা উত্তীর্ণ" হিসেবে অনুমোদিত'
            : `${label.bn} সম্পন্ন হয়েছে`
          : `${label.bn} আপডেট করা হয়েছে`,
        messageEn: value
          ? `Admin approved ${label.en} on your technician profile.`
          : `Admin updated ${label.en} status to pending on your profile.`,
        messageBn: value
          ? field === 'skillVerified'
            ? 'অ্যাডমিন আপনার বায়োডাটা ও NID যাচাই করে আপনাকে "দক্ষতা উত্তীর্ণ" হিসেবে অনুমোদন দিয়েছেন। এখন থেকে আপনি কাজ পিক করতে পারবেন!'
            : `অ্যাডমিন আপনার প্রোফাইলে "${label.bn}" অনুমোদন করেছেন।`
          : `অ্যাডমিন আপনার প্রোফাইলে "${label.bn}" স্ট্যাটাস পরিবর্তন করেছেন।`,
        type: 'system',
        link: '/technician/dashboard',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [techNotif, ...prev]);
      void saveNotificationToFirestore(techNotif);
    }
  };

  // Propagate customer avatar/name updates in real time to their submitted reviews
  useEffect(() => {
    if (!currentUser?.id) return;
    const targetAvatar = currentUser.avatar || '';
    const targetName = currentUser.name || '';
    const staleReviews = reviewsRef.current.filter(
      (r) =>
        r.customerId === currentUser.id &&
        (r.customerAvatar !== targetAvatar || (targetName && r.customerName !== targetName))
    );
    if (staleReviews.length === 0) return;
    setReviews((prev) =>
      prev.map((r) =>
        r.customerId === currentUser.id
          ? { ...r, customerAvatar: targetAvatar, customerName: targetName || r.customerName }
          : r
      )
    );
    staleReviews.forEach((r) => {
      void updateReviewInFirestore(r.id, {
        customerAvatar: targetAvatar,
        ...(targetName ? { customerName: targetName } : {}),
      });
    });
  }, [currentUser?.id, currentUser?.avatar, currentUser?.name]);

  const updateTechnicianProfile = async (
    technicianId: string,
    profileData: Partial<Technician>
  ): Promise<boolean> => {
    const existing = techniciansRef.current.find((t) => t.id === technicianId);
    if (!existing) return false;
    const updatedTech: Technician = { ...existing, ...profileData };
    const nextList = techniciansRef.current.map((t) =>
      t.id === technicianId ? updatedTech : t
    );
    techniciansRef.current = nextList;
    safeSetTechniciansCache(nextList);
    setTechnicians(nextList);

    pendingTechWritesRef.current += 1;
    let saved = false;
    try {
      saved = await saveTechnicianToFirestore(updatedTech);
      if (!saved) {
        saved = await updateTechnicianInFirestore(technicianId, profileData);
      }
      void syncTechnicianToServer(updatedTech).catch(() => {});

      // Keep active/past bookings in sync with updated technician avatar/name in real time
      if (profileData.avatar !== undefined || profileData.name !== undefined) {
        const affectedBookings = bookingsRef.current.filter(
          (b) =>
            b.technicianId === technicianId &&
            ((profileData.avatar !== undefined && b.technicianAvatar !== updatedTech.avatar) ||
              (profileData.name !== undefined && b.technicianName !== updatedTech.name))
        );
        if (affectedBookings.length > 0) {
          setBookings((prev) =>
            prev.map((b) =>
              b.technicianId === technicianId
                ? {
                    ...b,
                    technicianAvatar: updatedTech.avatar || '',
                    technicianName: updatedTech.name || b.technicianName,
                  }
                : b
            )
          );
          affectedBookings.forEach((b) => {
            void updateBookingInFirestore(b.id, {
              technicianAvatar: updatedTech.avatar || '',
              technicianName: updatedTech.name || b.technicianName,
            });
          });
        }
      }
    } finally {
      pendingTechWritesRef.current = Math.max(0, pendingTechWritesRef.current - 1);
    }
    return saved;
  };

  const deleteTechnician = (technicianId: string) => {
    setTechnicians((prev) => prev.filter((t) => t.id !== technicianId));
    void deleteTechnicianFromFirestore(technicianId);
  };

  const toggleBlockTechnician = async (
    technicianId: string,
    blocked: boolean,
    reason?: string
  ) => {
    const target = techniciansRef.current.find((t) => t.id === technicianId);
    const cleanReason = (reason || '').trim();
    const blockedAt = blocked ? new Date().toISOString() : '';

    const patch: Partial<Technician> = blocked
      ? {
          isBlocked: true,
          blockedReason: cleanReason || 'প্ল্যাটফর্ম নীতিমালা লঙ্ঘন / প্রশাসনিক সিদ্ধান্ত',
          blockedAt,
          availability: 'offline',
        }
      : {
          isBlocked: false,
          blockedReason: '',
          blockedAt: '',
        };

    await updateTechnicianProfile(technicianId, patch);

    if (target?.userId) {
      await updateUserInFirestore(target.userId, {
        isBlocked: blocked,
        blockedReason: blocked ? patch.blockedReason : '',
        blockedAt,
      });
    }

    if (target) {
      const notif: NotificationItem = {
        id: `notif-block-${Date.now()}`,
        userId: target.id,
        role: 'TECHNICIAN',
        titleEn: blocked ? 'Account Suspended by Admin' : 'Account Restored by Admin',
        titleBn: blocked
          ? '🚫 আপনার টেকনিশিয়ান অ্যাকাউন্ট সাময়িকভাবে ব্লক করা হয়েছে'
          : '✅ আপনার টেকনিশিয়ান অ্যাকাউন্ট আনব্লক করা হয়েছে',
        messageEn: blocked
          ? `Your account was blocked by Admin. Reason: ${patch.blockedReason}`
          : 'Admin has unblocked your account. You can resume accepting jobs.',
        messageBn: blocked
          ? `অ্যাডমিন আপনার অ্যাকাউন্ট ব্লক করেছেন। কারণ: ${patch.blockedReason}`
          : 'অ্যাডমিন আপনার অ্যাকাউন্টটি পুনরায় সক্রিয় (আনব্লক) করেছেন।',
        type: 'system',
        link: '/technician/dashboard',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
      void saveNotificationToFirestore(notif);
    }
  };

  const adminReportTechnician = async (
    technician: Technician,
    reason: string,
    description: string
  ) => {
    const nowIso = new Date().toISOString();
    const newReport: ReportItem = {
      id: `rep-adm-${Date.now()}`,
      bookingId: 'ADMIN-TECH-REVIEW',
      bookingNumber: 'ADMIN-WARNING',
      reporterId: currentUser?.id || 'admin-wasin',
      reporterName: currentUser?.name || 'Platform Admin',
      reporterRole: 'ADMIN',
      targetId: technician.id,
      targetName: technician.name,
      targetRole: 'TECHNICIAN',
      reason: reason.trim() || 'নীতিমালা সতর্কীকরণ / Policy Violation',
      description: description.trim() || reason.trim(),
      status: 'OPEN',
      createdAt: nowIso,
    };

    setReports((prev) => [newReport, ...prev]);
    await saveReportToFirestore(newReport);

    const techNotif: NotificationItem = {
      id: `notif-adm-rep-${Date.now()}`,
      userId: technician.id,
      role: 'TECHNICIAN',
      titleEn: `Official Report / Warning Issued`,
      titleBn: `⚠️ অ্যাডমিনের পক্ষ থেকে অফিশিয়াল রিপোর্ট / সতর্কবার্তা`,
      messageEn: `${newReport.reason}: ${newReport.description}`,
      messageBn: `${newReport.reason} — ${newReport.description}`,
      type: 'system',
      link: '/technician/dashboard',
      isRead: false,
      createdAt: nowIso,
    };
    setNotifications((prev) => [techNotif, ...prev]);
    void saveNotificationToFirestore(techNotif);
  };

  const addTechnicianPortfolio = (technicianId: string, item: Omit<PortfolioItem, 'id'>) => {
    const newItem: PortfolioItem = {
      ...item,
      id: `port-${Date.now()}`,
    };
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id !== technicianId) return t;
        const updated = { ...t, portfolio: [newItem, ...(t.portfolio || [])] };
        void saveTechnicianToFirestore(updated);
        return updated;
      })
    );
  };

  const deleteTechnicianPortfolio = (technicianId: string, itemId: string) => {
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id !== technicianId) return t;
        const updated = {
          ...t,
          portfolio: (t.portfolio || []).filter((p) => p.id !== itemId),
        };
        void saveTechnicianToFirestore(updated);
        return updated;
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        categories,
        technicians,
        bookings,
        notifications,
        favorites,
        comparedTechIds,
        chatMessages,
        reviews,
        warranties,
        reports,
        maintenanceReminders,
        addCategory,
        updateCategory,
        deleteCategory,
        createBooking,
        updateBookingStatus,
        deleteBooking,
        generateInvoice,
        submitReview,
        updateReview,
        toggleFavorite,
        isFavorite,
        addToCompare,
        removeFromCompare,
        clearCompare,
        sendMessage,
        deleteChatMessage,
        markChatMessagesRead,
        getUnreadChatCount,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        submitWarrantyClaim,
        updateWarrantyStatus,
        deleteWarrantyClaim,
        submitReport,
        resolveReport,
        deleteReport,
        addMaintenanceReminder,
        deleteMaintenanceReminder,
        updateTechnicianAvailability,
        verifyTechnicianField,
        techniciansHydrated,
        registerNewTechnician,
        updateTechnicianProfile,
        deleteTechnician,
        toggleBlockTechnician,
        adminReportTechnician,
        addTechnicianPortfolio,
        deleteTechnicianPortfolio,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
