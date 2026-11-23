import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wallet,
  Banknote,
  ShieldAlert,
  Lock,
  Unlock,
  Search,
  CreditCard,
  Clock,
  Landmark,
  ArrowUpRight,
} from 'lucide-react';
import {
  adminWithdrawalAction,
  checkOverdueCashAdmin,
  decideOnlinePaymentAdmin,
  fetchAdminFinanceOverview,
  getStoredAuthToken,
  refundPaymentAdmin,
  setTechnicianReserveAdmin,
  setTechnicianRestrictionAdmin,
  syncServerSession,
  verifyCashDepositAdmin,
  verifyPayoutAccountAdmin,
} from '../../services/financeApi';
import {
  adminDecideOnlinePaymentInFirestore,
  adminProcessWithdrawalInFirestore,
  adminVerifyCashDepositInFirestore,
  computeAdminSummaryFromFirestore,
  computeWalletFromFirestoreRecords,
  subscribeToCashCollections,
  subscribeToFinanceTransactions,
  subscribeToPayoutAccounts,
  subscribeToWalletLedger,
  subscribeToWithdrawals,
  verifyPayoutAccountInFirestore,
} from '../../services/firestoreFinanceService';
import type {
  AdminFinancialSummary,
  CashCollectionRecord,
  PaymentTransaction,
  PayoutAccount,
  WalletLedgerEntry,
  WalletSummary,
  WithdrawalRequest,
} from '../../types/finance';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

export const AdminFinancialDashboard: React.FC = () => {
  const { isBangla } = useLanguage();
  const { authTokenReady, currentUser } = useAuth();
  const { technicians, bookings } = useApp();

  // Express / Server fallback state
  const [serverSummary, setServerSummary] = useState<AdminFinancialSummary | null>(null);
  const [serverTechWallets, setServerTechWallets] = useState<
    Array<{ id: string; name: string; phone: string; primaryArea: string; wallet: WalletSummary }>
  >([]);
  const [serverWithdrawals, setServerWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [serverCashDeposits, setServerCashDeposits] = useState<any[]>([]);
  const [serverPayoutAccounts, setServerPayoutAccounts] = useState<any[]>([]);
  const [serverTransactions, setServerTransactions] = useState<any[]>([]);
  const [serverPaymentTransactions, setServerPaymentTransactions] = useState<PaymentTransaction[]>([]);

  // Real-Time Firestore state (Cross-user live sync)
  const [fsPaymentTransactions, setFsPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [fsLedger, setFsLedger] = useState<WalletLedgerEntry[]>([]);
  const [fsWithdrawals, setFsWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [fsPayoutAccounts, setFsPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [fsCashCollections, setFsCashCollections] = useState<CashCollectionRecord[]>([]);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');

  const [subTab, setSubTab] = useState<
    'overview' | 'escrow' | 'withdrawals' | 'cash' | 'wallets' | 'ledger'
  >('overview');
  const [loading, setLoading] = useState(false);
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});
  const [reserveInputs, setReserveInputs] = useState<Record<string, string>>({});

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  };

  const formatVerificationStatus = (status: string) => {
    if (!isBangla) {
      if (status === 'VERIFIED') return 'Verified';
      if (status === 'REJECTED') return 'Rejected';
      if (status === 'PENDING') return 'Pending';
      return status;
    }
    if (status === 'VERIFIED') return 'যাচাইকৃত';
    if (status === 'REJECTED') return 'বাতিল';
    if (status === 'PENDING') return 'অপেক্ষমাণ';
    return status;
  };

  const formatWithdrawalStatus = (status: string) => {
    if (!isBangla) {
      if (status === 'COMPLETED') return 'Completed';
      if (status === 'PROCESSING') return 'Processing';
      if (status === 'UNDER_REVIEW') return 'Under Review';
      if (status === 'PENDING') return 'Pending';
      if (status === 'FAILED') return 'Failed';
      if (status === 'REJECTED') return 'Rejected';
      if (status === 'REVERSED') return 'Reversed';
      return status;
    }
    if (status === 'COMPLETED') return 'সম্পন্ন';
    if (status === 'PROCESSING') return 'প্রসেসিং';
    if (status === 'UNDER_REVIEW') return 'পর্যালোচনায়';
    if (status === 'PENDING') return 'অপেক্ষমাণ';
    if (status === 'FAILED') return 'ব্যর্থ';
    if (status === 'REJECTED') return 'বাতিল';
    if (status === 'REVERSED') return 'ফেরত';
    return status;
  };

  const formatCashDepositStatus = (status: string) => {
    if (!isBangla) {
      if (status === 'CASH_PENDING') return 'Cash Pending';
      if (status === 'VERIFICATION_PENDING') return 'Verification Pending';
      if (status === 'COMMISSION_RECORDED') return 'Commission Recorded';
      if (status === 'OVERDUE') return 'Overdue';
      if (status === 'REJECTED') return 'Rejected';
      if (status === 'DISPUTED') return 'Disputed';
      return status;
    }
    if (status === 'CASH_PENDING') return 'জমা বাকি';
    if (status === 'VERIFICATION_PENDING') return 'যাচাই অপেক্ষমাণ';
    if (status === 'COMMISSION_RECORDED') return 'কমিশন হিসাবভুক্ত';
    if (status === 'OVERDUE') return 'সময়সীমা অতিক্রান্ত';
    if (status === 'REJECTED') return 'বাতিল';
    if (status === 'DISPUTED') return 'বিতর্কিত';
    return status;
  };

  const formatPaymentStatus = (status: string) => {
    if (!isBangla) {
      if (status === 'PAID' || status === 'VERIFIED') return 'Accepted (90/10)';
      if (status === 'PENDING_ADMIN_APPROVAL') return 'In Escrow (Accept Needed)';
      if (status === 'PENDING_APPROVAL') return 'Pending Approval';
      if (status === 'REJECTED') return 'Rejected';
      if (status === 'PENDING') return 'Pending';
      if (status === 'CASH_ON_SERVICE') return 'Cash on Service';
      if (status === 'REFUNDED') return 'Refunded';
      return status;
    }
    if (status === 'PAID' || status === 'VERIFIED') return 'গৃহীত (৯০/১০)';
    if (status === 'PENDING_ADMIN_APPROVAL') return 'এসক্রোতে (একসেপ্ট করুন)';
    if (status === 'PENDING_APPROVAL') return 'অনুমোদনের অপেক্ষায়';
    if (status === 'REJECTED') return 'প্রত্যাখ্যাত';
    if (status === 'PENDING') return 'বাকি';
    if (status === 'CASH_ON_SERVICE') return 'কাজ শেষে নগদ';
    if (status === 'REFUNDED') return 'রিফান্ডকৃত';
    return status;
  };

  // Real-time Firestore subscriptions
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    const unsubTx = subscribeToFinanceTransactions(setFsPaymentTransactions);
    const unsubLedger = subscribeToWalletLedger(setFsLedger);
    const unsubWithdrawals = subscribeToWithdrawals(setFsWithdrawals);
    const unsubAccounts = subscribeToPayoutAccounts(setFsPayoutAccounts);
    const unsubCash = subscribeToCashCollections(setFsCashCollections);
    return () => {
      unsubTx();
      unsubLedger();
      unsubWithdrawals();
      unsubAccounts();
      unsubCash();
    };
  }, [currentUser?.id, currentUser?.role]);

  const loadOverview = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      if (!authTokenReady) {
        await syncServerSession(currentUser);
      }
      const data = await fetchAdminFinanceOverview({
        search: searchFilter,
        status: statusFilter,
        dateFrom,
      });
      setServerSummary(data.summary);
      setServerTechWallets(data.techWallets);
      setServerWithdrawals(data.withdrawals);
      setServerCashDeposits(data.cashDeposits);
      setServerPayoutAccounts(data.payoutAccounts);
      setServerTransactions(data.transactions);
      setServerPaymentTransactions(data.paymentTransactions);
    } catch {
      // Firestore real-time state continues working without interruption
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authTokenReady && currentUser?.role === 'ADMIN') {
      void loadOverview();
    } else {
      setLoading(false);
    }
  }, [authTokenReady, currentUser?.role]);

  // Merge Firestore live records with any server-only records
  const paymentTransactions = [
    ...fsPaymentTransactions,
    ...serverPaymentTransactions.filter((st) => !fsPaymentTransactions.some((ft) => ft.id === st.id)),
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const withdrawals = [
    ...fsWithdrawals,
    ...serverWithdrawals.filter((sw) => !fsWithdrawals.some((fw) => fw.id === sw.id)),
  ].sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());

  const payoutAccounts = [
    ...fsPayoutAccounts.map((pa) => ({
      ...pa,
      technicianName: technicians.find((t) => t.id === pa.technicianId)?.name || pa.technicianId,
    })),
    ...serverPayoutAccounts.filter((sa) => !fsPayoutAccounts.some((fa) => fa.id === sa.id)),
  ];

  const mergedCashRecords = [
    ...fsCashCollections,
    ...serverCashDeposits
      .filter((sc) => !fsCashCollections.some((fc) => fc.id === sc.cashCollectionId))
      .map((sc) => ({
        id: sc.cashCollectionId,
        bookingId: sc.bookingId,
        bookingNumber: sc.bookingNumber,
        technicianId: sc.technicianId,
        technicianName: sc.technicianName,
        customerId: '',
        amountCollected: sc.amountCollected,
        commissionAmount: sc.commissionAmount,
        technicianShareAmount: sc.technicianShareAmount,
        status: sc.status,
        collectedAt: sc.deadlineAt,
        deadlineAt: sc.deadlineAt,
        graceEndsAt: sc.deadlineAt,
        reminderCount: 0,
        bookingRestrictedApplied: false,
        deposit: sc.depositId
          ? {
              id: sc.depositId,
              cashCollectionId: sc.cashCollectionId,
              bookingId: sc.bookingId,
              technicianId: sc.technicianId,
              channel: sc.channel,
              depositReference: sc.depositReference,
              amountDeposited: sc.amountCollected,
              status: sc.depositStatus,
              submittedAt: sc.deadlineAt,
            }
          : null,
      })),
  ];

  const cashDeposits = mergedCashRecords.map((c) => ({
    raw: c,
    cashCollectionId: c.id,
    bookingId: c.bookingId,
    bookingNumber: c.bookingNumber,
    technicianId: c.technicianId,
    technicianName: c.technicianName,
    amountCollected: c.amountCollected,
    commissionAmount: c.commissionAmount,
    technicianShareAmount: c.technicianShareAmount,
    deadlineAt: c.deadlineAt,
    status: c.status,
    depositId: c.deposit?.id || null,
    depositStatus: c.deposit?.status || null,
    channel: c.deposit?.channel || null,
    depositReference: c.deposit?.depositReference || null,
  }));

  const techWallets = technicians.map((t) => {
    const srv = serverTechWallets.find((st) => st.id === t.id);
    const hasFs =
      fsLedger.some((l) => l.technicianId === t.id) ||
      fsWithdrawals.some((w) => w.technicianId === t.id) ||
      fsCashCollections.some((c) => c.technicianId === t.id);
    return {
      id: t.id,
      name: t.name,
      phone: t.phone,
      primaryArea: t.primaryArea || t.district || 'Dhaka',
      wallet:
        hasFs || !srv
          ? computeWalletFromFirestoreRecords(
              t.id,
              fsLedger,
              withdrawals,
              mergedCashRecords,
              srv?.wallet.customReserveBalance || 0
            )
          : srv.wallet,
    };
  });

  const liveSummary = computeAdminSummaryFromFirestore(
    technicians,
    paymentTransactions,
    fsLedger,
    withdrawals,
    mergedCashRecords
  );

  const summary: AdminFinancialSummary =
    fsLedger.length > 0 ||
    paymentTransactions.length > 0 ||
    withdrawals.length > 0 ||
    mergedCashRecords.length > 0 ||
    !serverSummary
      ? liveSummary
      : serverSummary;

  const transactions = (serverTransactions.length > 0
    ? serverTransactions
    : bookings.map((b) => {
        const total = b.finalTotal || b.estimatedTotalMax || 0;
        const comm = Math.round(total * 0.1);
        return {
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          customerName: b.customerName,
          technicianName: b.technicianName,
          paymentMethod: b.paymentMethod,
          paymentStatus: b.paymentStatus,
          finalAgreedAmount: total,
          platformCommissionPercent: 10,
          platformCommissionAmount: comm,
          technicianEarningsAmount: total - comm,
        };
      })
  ).filter((tx) => {
    const q = searchFilter.trim().toLowerCase();
    if (q) {
      const hay = `${tx.bookingNumber} ${tx.customerName} ${tx.technicianName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (statusFilter && tx.paymentStatus !== statusFilter) return false;
    return true;
  });

  const pendingEscrowTxs = paymentTransactions.filter(
    (tx) => tx.status === 'PENDING_ADMIN_APPROVAL' || tx.status === 'PENDING'
  );
  const openWithdrawalsCount = withdrawals.filter((w) =>
    ['PENDING', 'UNDER_REVIEW', 'PROCESSING'].includes(w.status)
  ).length;
  const openCashCount = cashDeposits.filter((c) =>
    ['CASH_PENDING', 'VERIFICATION_PENDING', 'OVERDUE'].includes(c.status)
  ).length;

  const handleDecideOnlinePayment = async (
    tx: PaymentTransaction,
    decision: 'APPROVE' | 'REJECT'
  ) => {
    if (!currentUser) return;
    setProcessingTxId(tx.id);
    setErrorMsg(null);
    try {
      await adminDecideOnlinePaymentInFirestore({
        tx,
        decision,
        adminId: currentUser.id,
        adminName: currentUser.name,
      });
      if (getStoredAuthToken()) {
        void decideOnlinePaymentAdmin(tx.id, decision).catch(() => {});
      }
      const techShare = tx.technicianAmount ?? Math.round(tx.amount * 0.9);
      const commShare = tx.commissionAmount ?? tx.amount - techShare;
      notify(
        decision === 'APPROVE'
          ? isBangla
            ? `পেমেন্ট গৃহীত! ৯০% (৳${techShare}) টেকনিশিয়ানের ওয়ালেটে ও ১০% (৳${commShare}) অ্যাডমিন অ্যাকাউন্টে জমা হয়েছে।`
            : `Payment accepted! ৳${techShare} (90%) credited to Technician & ৳${commShare} (10%) to Admin.`
          : isBangla
            ? `পেমেন্ট (${tx.providerTxId || tx.id}) প্রত্যাখ্যাত হয়েছে এবং গ্রাহক ও টেকনিশিয়ানকে জানানো হয়েছে।`
            : `Payment (${tx.providerTxId || tx.id}) rejected.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'পেমেন্ট সিদ্ধান্ত সংরক্ষণ ব্যর্থ হয়েছে।' : 'Failed to update payment.'));
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      const token = getStoredAuthToken();
      let blob: Blob | null = null;
      try {
        const res = await fetch('/api/admin/finance/export', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && !contentType.includes('text/html')) {
          blob = await res.blob();
        }
      } catch {
        // fallback below
      }

      if (!blob) {
        const headers = [
          'BookingNumber',
          'CustomerName',
          'TechnicianName',
          'PaymentMethod',
          'PaymentStatus',
          'FinalTotal',
          'CommissionAmount',
          'TechnicianNet',
        ];
        const rows = transactions.map((tx) =>
          [
            tx.bookingNumber ?? '',
            tx.customerName ?? '',
            tx.technicianName ?? '',
            tx.paymentMethod ?? '',
            tx.paymentStatus ?? '',
            tx.finalAgreedAmount ?? 0,
            tx.platformCommissionAmount ?? 0,
            tx.technicianEarningsAmount ?? 0,
          ]
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(',')
        );
        blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], {
          type: 'text/csv;charset=utf-8;',
        });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `servexa-financial-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify(isBangla ? 'আর্থিক লেজার CSV এক্সপোর্ট হয়েছে।' : 'Financial ledger CSV exported.');
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'CSV ডাউনলোড ব্যর্থ হয়েছে।' : 'CSV download failed.'));
    }
  };

  const handleWithdrawalAction = async (
    w: WithdrawalRequest,
    action: 'UNDER_REVIEW' | 'PROCESSING' | 'COMPLETE' | 'FAIL' | 'REJECT'
  ) => {
    if (!currentUser) return;
    setErrorMsg(null);
    try {
      const ref = (payoutRefs[w.id] || '').trim();
      const isFsRecord = fsWithdrawals.some((fw) => fw.id === w.id);
      if (isFsRecord) {
        await adminProcessWithdrawalInFirestore({
          withdrawal: w,
          action,
          adminId: currentUser.id,
          providerReference: action === 'COMPLETE' ? ref : undefined,
          note: `Admin marked withdrawal ${action}`,
        });
      }
      if (getStoredAuthToken()) {
        void adminWithdrawalAction(
          w.id,
          action,
          action === 'COMPLETE' ? ref : undefined,
          `Admin marked withdrawal ${action}`
        ).catch(() => {});
      }
      notify(
        isBangla
          ? `উত্তোলন #${w.id}-এর অবস্থা ${formatWithdrawalStatus(action === 'COMPLETE' ? 'COMPLETED' : action === 'FAIL' ? 'FAILED' : action)}-এ আপডেট হয়েছে।`
          : `Withdrawal #${w.id} updated to ${action}.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'উত্তোলন কার্যক্রম ব্যর্থ হয়েছে।' : 'Withdrawal action failed.'));
    }
  };

  const handleVerifyCashDeposit = async (
    c: { raw: CashCollectionRecord; depositId: string | null },
    decision: 'APPROVE' | 'REJECT' | 'DISPUTE'
  ) => {
    if (!currentUser) return;
    setErrorMsg(null);
    try {
      const isFs = fsCashCollections.some((fc) => fc.id === c.raw.id);
      if (isFs) {
        await adminVerifyCashDepositInFirestore(
          c.raw,
          decision,
          currentUser.id,
          `Reconciled by Admin: ${decision}`
        );
      }
      if (c.depositId && getStoredAuthToken()) {
        void verifyCashDepositAdmin(c.depositId, decision, `Reconciled by Admin: ${decision}`).catch(
          () => {}
        );
      }
      notify(
        isBangla
          ? decision === 'APPROVE'
            ? 'নগদ জমা যাচাই ও ৯০/১০ লেজার সমন্বয় সম্পন্ন হয়েছে।'
            : `নগদ জমা ${decision === 'REJECT' ? 'বাতিল' : 'বিতর্কিত'} হিসেবে চিহ্নিত হয়েছে।`
          : `Cash deposit ${decision === 'APPROVE' ? 'verified & 90/10 ledger posted' : decision.toLowerCase()}.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'নগদ সমন্বয় ব্যর্থ হয়েছে।' : 'Cash reconciliation failed.'));
    }
  };

  const handleCheckOverdueCash = async () => {
    setErrorMsg(null);
    try {
      const res: any = await checkOverdueCashAdmin(true);
      notify(
        isBangla
          ? `বকেয়া পরীক্ষা সম্পন্ন: ${res.markedOverdue}টি সময়সীমা অতিক্রান্ত, ${res.restrictedTechs?.length || 0} জন টেকনিশিয়ান সীমাবদ্ধ।`
          : `Overdue check complete: ${res.markedOverdue} overdue, ${res.restrictedTechs?.length || 0} technician(s) restricted.`
      );
      void loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'বকেয়া পরীক্ষা ব্যর্থ হয়েছে।' : 'Overdue check failed.'));
    }
  };

  const handleToggleRestriction = async (techId: string, restricted: boolean) => {
    try {
      await setTechnicianRestrictionAdmin(
        techId,
        restricted,
        restricted ? 'Admin overdue cash hold' : 'Admin lifted restriction'
      );
      notify(
        isBangla
          ? restricted
            ? 'টেকনিশিয়ানের নতুন বুকিং স্থগিত করা হয়েছে।'
            : 'বুকিং স্থগিতাদেশ তুলে নেওয়া হয়েছে।'
          : restricted
            ? 'Technician restricted from new bookings.'
            : 'Booking restriction lifted.'
      );
      void loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'সীমাবদ্ধতা পরিবর্তন ব্যর্থ হয়েছে।' : 'Failed to toggle restriction.'));
    }
  };

  const handleSaveReserve = async (techId: string) => {
    try {
      const raw = reserveInputs[techId];
      const val = raw === '' || raw === undefined ? null : Number(raw);
      await setTechnicianReserveAdmin(techId, val, 'Admin technician reserve adjustment');
      notify(isBangla ? 'টেকনিশিয়ান রিজার্ভ সীমা আপডেট হয়েছে।' : 'Technician reserve requirement updated.');
      void loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'রিজার্ভ আপডেট ব্যর্থ হয়েছে।' : 'Failed to update reserve.'));
    }
  };

  const handleVerifyPayoutAccount = async (pa: PayoutAccount, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const isFs = fsPayoutAccounts.some((fa) => fa.id === pa.id);
      if (isFs) {
        await verifyPayoutAccountInFirestore(pa, status, `Admin marked payout account ${status}`);
      }
      if (getStoredAuthToken()) {
        void verifyPayoutAccountAdmin(pa.id, status, `Admin marked payout account ${status}`).catch(
          () => {}
        );
      }
      notify(
        isBangla
          ? `পেমেন্ট অ্যাকাউন্ট ${status === 'VERIFIED' ? 'যাচাইকৃত' : 'বাতিল'} হয়েছে।`
          : `Payout account ${status.toLowerCase()}.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'পেমেন্ট অ্যাকাউন্ট যাচাই ব্যর্থ হয়েছে।' : 'Failed to verify payout account.'));
    }
  };

  const handleIssueRefund = async (txId: string, amount: number) => {
    try {
      await refundPaymentAdmin(txId, amount, 'Admin dispute refund');
      notify(
        isBangla
          ? `৳${amount} রিফান্ড সম্পন্ন হয়েছে এবং টেকনিশিয়ান লেজার সমন্বয় করা হয়েছে।`
          : `Refund of ৳${amount} issued and technician ledger debited.`
      );
      void loadOverview();
    } catch (err: any) {
      setErrorMsg(err?.message || (isBangla ? 'রিফান্ড ব্যর্থ হয়েছে।' : 'Refund failed.'));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Enterprise Header */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              {isBangla
                ? 'Servexa লাইভ ফাইন্যান্স, এসক্রো ও রিকনসিলিয়েশন'
                : 'Servexa Live Finance, Escrow & Reconciliation'}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isBangla
              ? 'রিয়েল-টাইম অনলাইন ব্যাংকিং এসক্রো অনুমোদন, স্বয়ংক্রিয় ৯০% টেকনিশিয়ান / ১০% অ্যাডমিন বণ্টন এবং উইথড্রয়াল সেটেলমেন্ট।'
              : 'Real-time online banking escrow acceptance, automated 90% Technician / 10% Admin ledger split, and withdrawal settlement.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={handleCheckOverdueCash}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{isBangla ? 'বকেয়া নগদ পরীক্ষা' : 'Check Overdue Cash'}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{isBangla ? 'CSV লেজার' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={loading}
            aria-label="Refresh"
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer flex items-center gap-1 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* Prominent Live Escrow Action Banner if Customer Payments Need Admin Acceptance */}
      {pendingEscrowTxs.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-blue-900 dark:text-blue-200">
              <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                {isBangla
                  ? `অ্যাডমিন এসক্রোতে ${pendingEscrowTxs.length}টি অনলাইন পেমেন্ট অনুমোদনের অপেক্ষায়`
                  : `${pendingEscrowTxs.length} Online Payment(s) Held in Admin Escrow`}
              </span>
            </div>
            <span className="text-xs font-extrabold tabular-nums text-blue-700 dark:text-blue-300">
              {isBangla ? 'মোট এসক্রো:' : 'Escrow Total:'} ৳{(summary.pendingEscrowAmount || 0).toLocaleString()}
            </span>
          </div>

          <div className="space-y-2">
            {pendingEscrowTxs.map((tx) => {
              const techShare = tx.technicianAmount ?? Math.round(tx.amount * 0.9);
              const commShare = tx.commissionAmount ?? tx.amount - techShare;
              const isBusy = processingTxId === tx.id;
              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 font-bold text-zinc-900 dark:text-white">
                      <span className="font-mono text-orange-600">#{tx.bookingNumber || tx.bookingId}</span>
                      <span>· {tx.customerName || 'Customer'}</span>
                      <span className="text-zinc-400">→</span>
                      <span>{tx.technicianName || 'Technician'}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {tx.bankOrProviderName || tx.method.toUpperCase()} ·{' '}
                      <span className="font-mono">{tx.providerTxId || tx.id}</span>
                      {tx.senderAccountMasked ? ` (${tx.senderAccountMasked})` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
                    <div className="text-left sm:text-right tabular-nums">
                      <div className="font-black text-zinc-900 dark:text-white text-sm">৳{tx.amount}</div>
                      <div className="text-[10px] text-zinc-500">
                        <span className="text-emerald-600 font-bold">৯০%: ৳{techShare}</span> ·{' '}
                        <span className="text-blue-600 font-bold">১০%: ৳{commShare}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDecideOnlinePayment(tx, 'APPROVE')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{isBangla ? 'একসেপ্ট (৯০/১০)' : 'Accept (90/10)'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDecideOnlinePayment(tx, 'REJECT')}
                        className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{isBangla ? 'বাতিল' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold">
        {(
          [
            ['overview', isBangla ? 'আর্থিক ওভারভিউ' : 'Overview'],
            ['escrow', isBangla ? 'অনলাইন পেমেন্ট এসক্রো' : 'Online Escrow', pendingEscrowTxs.length],
            ['withdrawals', isBangla ? 'উত্তোলন ও কেওয়াইসি' : 'Withdrawals & KYC', openWithdrawalsCount],
            ['cash', isBangla ? 'নগদ কালেকশন' : 'Cash Collection', openCashCount],
            ['wallets', isBangla ? 'টেকনিশিয়ান ওয়ালেট' : 'Tech Wallets', techWallets.length],
            ['ledger', isBangla ? 'লেনদেন লেজার' : 'Ledger', transactions.length],
          ] as const
        ).map(([k, label, count]) => {
          const hasPending = (k === 'escrow' && pendingEscrowTxs.length > 0) ||
                             (k === 'withdrawals' && openWithdrawalsCount > 0) ||
                             (k === 'cash' && openCashCount > 0);
          return (
            <button
              key={k}
              type="button"
              onClick={() => setSubTab(k)}
              className={`px-3 py-1.5 sm:py-2 rounded-xl cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 font-bold ${
                subTab === k
                  ? 'bg-orange-600 text-white shadow-md'
                  : hasPending
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                  subTab === k ? 'bg-white text-orange-600' : 'bg-orange-600 text-white animate-pulse'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: OVERVIEW & 90/10 METRICS */}
      {subTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 text-xs">
            {[
              [
                isBangla ? 'মোট প্ল্যাটফর্ম আয় (GMV)' : 'Total Platform Volume (GMV)',
                `৳${summary.totalPlatformRevenue.toLocaleString()}`,
                'text-zinc-900 dark:text-white',
              ],
              [
                isBangla ? 'অ্যাডমিন অ্যাকাউন্ট (১০% কমিশন)' : 'Admin Balance (10% Comm)',
                `৳${summary.totalPlatformCommission.toLocaleString()}`,
                'text-emerald-600 dark:text-emerald-400',
              ],
              [
                isBangla ? 'টেকনিশিয়ান মোট আয় (৯০%)' : 'Technician Earnings (90%)',
                `৳${summary.totalTechnicianEarnings.toLocaleString()}`,
                'text-orange-600 dark:text-orange-400',
              ],
              [
                isBangla ? 'অ্যাডমিন এসক্রোতে অপেক্ষমাণ' : 'Pending Admin Escrow',
                `৳${(summary.pendingEscrowAmount || 0).toLocaleString()} (${summary.pendingEscrowCount || 0})`,
                'text-blue-600 dark:text-blue-400',
              ],
              [
                isBangla ? 'টেকনিশিয়ান উত্তোলনযোগ্য ব্যালেন্স' : 'Tech Withdrawable Balance',
                `৳${summary.totalWithdrawableBalance.toLocaleString()}`,
                'text-emerald-600 dark:text-emerald-400',
              ],
              [
                isBangla ? 'অপেক্ষমাণ উত্তোলন আবেদন' : 'Open Withdrawal Requests',
                `${summary.pendingWithdrawalsCount} · ৳${summary.pendingWithdrawalsAmount.toLocaleString()}`,
                'text-amber-600 dark:text-amber-400',
              ],
              [
                isBangla ? 'সম্পন্ন উত্তোলন পরিশোধ' : 'Completed Withdrawals Paid',
                `${summary.completedWithdrawalsCount} · ৳${summary.completedWithdrawalsAmount.toLocaleString()}`,
                'text-emerald-600 dark:text-emerald-400',
              ],
              [
                isBangla ? 'মোট অনলাইন পেমেন্ট গৃহীত' : 'Verified Online Collections',
                `৳${summary.totalOnlineCollections.toLocaleString()}`,
                'text-blue-600 dark:text-blue-400',
              ],
              [
                isBangla ? 'টেকনিশিয়ানের সংগৃহীত নগদ' : 'Cash Collected by Techs',
                `৳${summary.cashCollectedByTechnicians.toLocaleString()}`,
                'text-zinc-900 dark:text-white',
              ],
              [
                isBangla ? 'বাকি / যাচাইকৃত নগদ জমা' : 'Pending / Verified Cash',
                `৳${summary.cashPendingDeposits} / ৳${summary.verifiedCashDeposits}`,
                'text-emerald-600 dark:text-emerald-400',
              ],
              [
                isBangla ? 'সময়সীমা উত্তীর্ণ নগদ' : 'Overdue Cash Deposits',
                `৳${summary.overdueCashDeposits.toLocaleString()}`,
                'text-rose-600 dark:text-rose-400',
              ],
              [
                isBangla ? 'মোট রিফান্ড পরিমাণ' : 'Total Refunds Issued',
                `৳${summary.totalRefundsAmount.toLocaleString()}`,
                'text-zinc-600 dark:text-zinc-300',
              ],
            ].map(([label, val, color], idx) => (
              <div
                key={idx}
                className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1"
              >
                <div className="text-[10px] sm:text-[11px] text-zinc-500 font-semibold leading-tight">
                  {label}
                </div>
                <div className={`text-sm sm:text-lg font-extrabold tabular-nums ${color}`}>{val}</div>
              </div>
            ))}
          </div>

          {/* 90/10 Distribution Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="font-extrabold text-zinc-900 dark:text-white">
                {isBangla ? '৯০/১০ প্ল্যাটফর্ম ও টেকনিশিয়ান আয় বণ্টন' : '90/10 Technician & Platform Split'}
              </div>
              <span className="text-[11px] font-mono text-zinc-500">90% Tech · 10% Servexa</span>
            </div>
            <div className="w-full h-3.5 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden flex">
              <div
                className="bg-orange-500 h-full"
                style={{
                  width: `${
                    summary.totalTechnicianEarnings + summary.totalPlatformCommission > 0
                      ? (summary.totalTechnicianEarnings /
                          (summary.totalTechnicianEarnings + summary.totalPlatformCommission)) *
                        100
                      : 90
                  }%`,
                }}
              />
              <div className="bg-emerald-500 h-full flex-1" />
            </div>
            <div className="flex flex-wrap gap-5 text-[11px] font-bold tabular-nums">
              <span className="text-orange-600 dark:text-orange-400">
                {isBangla ? 'টেকনিশিয়ান অংশ (৯০%):' : 'Technician Net (90%):'} ৳
                {summary.totalTechnicianEarnings.toLocaleString()}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {isBangla ? 'অ্যাডমিন অ্যাকাউন্ট (১০%):' : 'Admin Balance (10%):'} ৳
                {summary.totalPlatformCommission.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ONLINE PAYMENT ESCROW QUEUE */}
      {subTab === 'escrow' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {isBangla
                    ? 'অনলাইন ব্যাংকিং ও MFS পেমেন্ট অনুমোদন কেন্দ্র'
                    : 'Online Banking & MFS Payment Escrow Queue'}
                </span>
              </h4>
              <p className="text-[11px] text-zinc-500">
                {isBangla
                  ? 'গ্রাহকের পাঠানো প্রতিটি অনলাইন পেমেন্ট এখানে লাইভ দেখা যাবে। একসেপ্ট করলে ৯০% টেকনিশিয়ানের ওয়ালেটে ও ১০% অ্যাডমিন অ্যাকাউন্টে জমা হবে।'
                  : 'All customer online payments stream here live. Accepting splits 90% to Technician wallet and 10% to Servexa Admin.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <th className="py-2.5 pr-3">{isBangla ? 'বুকিং ও TxID' : 'Booking & TxID'}</th>
                  <th className="py-2.5 pr-3">{isBangla ? 'গ্রাহক / টেকনিশিয়ান' : 'Customer / Tech'}</th>
                  <th className="py-2.5 pr-3">{isBangla ? 'মাধ্যম / ব্যাংক' : 'Channel / Bank'}</th>
                  <th className="py-2.5 pr-3">{isBangla ? 'মোট ও বণ্টন (৯০/১০)' : 'Amount & Split'}</th>
                  <th className="py-2.5 pr-3">{isBangla ? 'অবস্থা' : 'Status'}</th>
                  <th className="py-2.5 text-right">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paymentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      {isBangla
                        ? 'এখনো কোনো অনলাইন পেমেন্ট জমা পড়েনি।'
                        : 'No online payment transactions recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  paymentTransactions.map((pt) => {
                    const techShare = pt.technicianAmount ?? Math.round(pt.amount * 0.9);
                    const commShare = pt.commissionAmount ?? pt.amount - techShare;
                    const isPending = pt.status === 'PENDING_ADMIN_APPROVAL' || pt.status === 'PENDING';
                    const isBusy = processingTxId === pt.id;
                    return (
                      <tr key={pt.id}>
                        <td className="py-3 pr-3">
                          <div className="font-mono font-bold text-orange-600">
                            #{pt.bookingNumber || pt.bookingId}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">
                            {pt.providerTxId || pt.id}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-bold text-zinc-900 dark:text-white">
                            {pt.customerName || pt.customerId}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {isBangla ? 'টেকনিশিয়ান:' : 'Tech:'} {pt.technicianName || pt.technicianId}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-bold uppercase">{pt.method}</div>
                          <div className="text-[10px] text-zinc-400">
                            {pt.bankOrProviderName || pt.providerMode}
                          </div>
                        </td>
                        <td className="py-3 pr-3 tabular-nums">
                          <div className="font-extrabold text-zinc-900 dark:text-white">৳{pt.amount}</div>
                          <div className="text-[10px] text-zinc-500">
                            90%: ৳{techShare} · 10%: ৳{commShare}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              pt.status === 'VERIFIED'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : pt.status === 'REJECTED'
                                  ? 'bg-rose-500/15 text-rose-600'
                                  : 'bg-blue-500/15 text-blue-600'
                            }`}
                          >
                            {formatPaymentStatus(pt.status)}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {isPending ? (
                            <div className="inline-flex gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDecideOnlinePayment(pt, 'APPROVE')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50"
                              >
                                {isBangla ? 'একসেপ্ট' : 'Accept'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDecideOnlinePayment(pt, 'REJECT')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer disabled:opacity-50"
                              >
                                {isBangla ? 'বাতিল' : 'Reject'}
                              </button>
                            </div>
                          ) : pt.status === 'VERIFIED' ? (
                            <button
                              type="button"
                              onClick={() => void handleIssueRefund(pt.id, pt.amount - pt.refundedAmount)}
                              className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 font-bold cursor-pointer"
                            >
                              {isBangla ? 'রিফান্ড' : 'Refund'}
                            </button>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: WITHDRAWALS & PAYOUT ACCOUNT KYC */}
      {subTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-3">
            <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-orange-600 shrink-0" />
              <span>{isBangla ? 'টেকনিশিয়ান টাকা উত্তোলন নিষ্পত্তি তালিকা' : 'Technician Withdrawal Settlement Queue'}</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    <th className="py-2 pr-3">{isBangla ? 'টেকনিশিয়ান ও অ্যাকাউন্ট' : 'Tech & Account'}</th>
                    <th className="py-2 pr-3">{isBangla ? 'আবেদিত' : 'Requested'}</th>
                    <th className="py-2 pr-3">{isBangla ? 'নিট প্রদেয়' : 'Net Payout'}</th>
                    <th className="py-2 pr-3">{isBangla ? 'অবস্থা' : 'Status'}</th>
                    <th className="py-2 pr-3">{isBangla ? 'প্রোভাইডার রেফারেন্স' : 'Provider Ref'}</th>
                    <th className="py-2 text-right">{isBangla ? 'পদক্ষেপ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-400">
                        {isBangla ? 'কোনো উত্তোলনের আবেদন নেই।' : 'No withdrawal requests yet.'}
                      </td>
                    </tr>
                  ) : (
                    withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td className="py-3 pr-3">
                          <div className="font-bold text-zinc-900 dark:text-white">
                            {w.technicianName ||
                              technicians.find((t) => t.id === w.technicianId)?.name ||
                              w.technicianId}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            {w.provider.toUpperCase()} · {w.accountNumberMasked}
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-bold tabular-nums">৳{w.requestedAmount}</td>
                        <td className="py-3 pr-3 font-black text-emerald-600 tabular-nums">৳{w.netPayoutAmount}</td>
                        <td className="py-3 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              w.status === 'COMPLETED'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : ['FAILED', 'REJECTED', 'REVERSED'].includes(w.status)
                                  ? 'bg-rose-500/15 text-rose-600'
                                  : 'bg-amber-500/15 text-amber-600'
                            }`}
                          >
                            {formatWithdrawalStatus(w.status)}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          {['PENDING', 'UNDER_REVIEW', 'PROCESSING'].includes(w.status) ? (
                            <input
                              type="text"
                              placeholder={isBangla ? 'পে-আউট TxID (ন্যূনতম ৪ অক্ষর)' : 'Payout TxID (min 4 chars)'}
                              value={payoutRefs[w.id] || ''}
                              onChange={(e) => setPayoutRefs({ ...payoutRefs, [w.id]: e.target.value })}
                              className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-[11px] w-28 sm:w-40"
                            />
                          ) : (
                            <span className="font-mono text-[11px]">{w.providerReference || w.failureReason || '—'}</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {['PENDING', 'UNDER_REVIEW', 'PROCESSING'].includes(w.status) && (
                            <div className="inline-flex flex-wrap justify-end gap-1">
                              {w.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => void handleWithdrawalAction(w, 'PROCESSING')}
                                  className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
                                >
                                  {isBangla ? 'প্রসেস' : 'Process'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleWithdrawalAction(w, 'COMPLETE')}
                                className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                              >
                                {isBangla ? 'সম্পন্ন' : 'Complete'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleWithdrawalAction(w, 'FAIL')}
                                className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                              >
                                {isBangla ? 'ব্যর্থ ও ফেরত' : 'Fail & Restore'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-3">
            <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              {isBangla ? 'টেকনিশিয়ান পেমেন্ট অ্যাকাউন্ট যাচাই (KYC)' : 'Technician Payout Accounts Verification'}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    <th className="py-2 pr-3">{isBangla ? 'টেকনিশিয়ান' : 'Technician'}</th>
                    <th className="py-2 pr-3">{isBangla ? 'মাধ্যম ও অ্যাকাউন্ট' : 'Provider & Account'}</th>
                    <th className="py-2 pr-3">{isBangla ? 'অ্যাকাউন্টের নাম' : 'Title'}</th>
                    <th className="py-2 pr-3">{isBangla ? 'অবস্থা' : 'Status'}</th>
                    <th className="py-2 text-right">{isBangla ? 'পদক্ষেপ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {payoutAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-400">
                        {isBangla ? 'কোনো পেআউট অ্যাকাউন্ট পাওয়া যায়নি।' : 'No payout accounts added yet.'}
                      </td>
                    </tr>
                  ) : (
                    payoutAccounts.map((pa) => (
                      <tr key={pa.id}>
                        <td className="py-2.5 pr-3 font-bold">{pa.technicianName}</td>
                        <td className="py-2.5 pr-3 font-mono uppercase">
                          {pa.provider} · {pa.accountNumber} {pa.bankName ? `(${pa.bankName})` : ''}
                        </td>
                        <td className="py-2.5 pr-3">{pa.accountTitle}</td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              pa.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : pa.verificationStatus === 'REJECTED'
                                  ? 'bg-rose-500/15 text-rose-600'
                                  : 'bg-amber-500/15 text-amber-600'
                            }`}
                          >
                            {formatVerificationStatus(pa.verificationStatus)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          {pa.verificationStatus === 'PENDING' && (
                            <div className="inline-flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleVerifyPayoutAccount(pa, 'VERIFIED')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                              >
                                {isBangla ? 'যাচাই করুন' : 'Verify'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleVerifyPayoutAccount(pa, 'REJECTED')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                              >
                                {isBangla ? 'বাতিল' : 'Reject'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CASH-ON-COMPLETION RECONCILIATION */}
      {subTab === 'cash' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-3">
          <div>
            <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>
                {isBangla
                  ? 'কাজ শেষে নগদ সংগ্রহ ও মার্চেন্ট ডিপোজিট সমন্বয়'
                  : 'Cash-on-Completion Collections & Merchant Deposit Reconciliation'}
              </span>
            </h4>
            <p className="text-xs text-zinc-500">
              {isBangla
                ? 'টেকনিশিয়ানের সংগৃহীত নগদ ও জমা দেওয়া TrxID এখানে রিয়েল-টাইমে দেখা যাবে।'
                : 'Technician cash collections and deposit references stream here in real time.'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <th className="py-2 pr-3">{isBangla ? 'বুকিং' : 'Booking'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'টেকনিশিয়ান' : 'Technician'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'সংগৃহীত / বিভাজন' : 'Collected / Split'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'জমার রেফারেন্স' : 'Deposit Reference'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'অবস্থা' : 'Status'}</th>
                  <th className="py-2 text-right">{isBangla ? 'সমন্বয়' : 'Reconcile'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {cashDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-400">
                      {isBangla ? 'কোনো নগদ লেনদেন নেই।' : 'No cash collections recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  cashDeposits.map((c) => (
                    <tr key={c.cashCollectionId}>
                      <td className="py-3 pr-3 font-mono font-bold text-orange-600">#{c.bookingNumber}</td>
                      <td className="py-3 pr-3 font-bold">{c.technicianName}</td>
                      <td className="py-3 pr-3 tabular-nums">
                        <div className="font-black">৳{c.amountCollected}</div>
                        <div className="text-[10px] text-zinc-400">
                          {isBangla ? 'টেকনিশিয়ান' : 'Tech'}: ৳{c.technicianShareAmount} · Servexa: ৳{c.commissionAmount}
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-[11px]">
                        {c.depositReference
                          ? `${c.channel}: ${c.depositReference}`
                          : isBangla
                            ? 'এখনো জমা দেওয়া হয়নি'
                            : 'Not submitted yet'}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            c.status === 'COMMISSION_RECORDED'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : c.status === 'OVERDUE'
                                ? 'bg-rose-500/20 text-rose-600'
                                : 'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {formatCashDepositStatus(c.status)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {c.depositId && c.depositStatus === 'VERIFICATION_PENDING' && (
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleVerifyCashDeposit(c, 'APPROVE')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                            >
                              {isBangla ? 'যাচাই ও ক্রেডিট' : 'Verify & Credit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleVerifyCashDeposit(c, 'REJECT')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                            >
                              {isBangla ? 'বাতিল' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: TECHNICIAN WALLETS */}
      {subTab === 'wallets' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-3">
          <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-orange-500" />
            <span>
              {isBangla
                ? 'সকল টেকনিশিয়ানের লাইভ ওয়ালেট, উত্তোলন ও বুকিং অ্যাক্সেস'
                : 'Live Technician Wallets, Withdrawals & Reserve Controls'}
            </span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <th className="py-2 pr-3">{isBangla ? 'টেকনিশিয়ান' : 'Technician'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'মোট আয় (৯০%)' : 'Total Earned'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'উপলব্ধ' : 'Available'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'উত্তোলনযোগ্য' : 'Withdrawable'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'মোট উত্তোলিত' : 'Withdrawn'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'বকেয়া নগদ' : 'Cash Pending'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'বুকিং অ্যাক্সেস' : 'Booking Access'}</th>
                  <th className="py-2 text-right">{isBangla ? 'রিজার্ভ (৳)' : 'Reserve'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {techWallets.map((tw) => (
                  <tr key={tw.id}>
                    <td className="py-3 pr-3">
                      <div className="font-bold text-zinc-900 dark:text-white">{tw.name}</div>
                      <div className="text-[10px] text-zinc-400">
                        {tw.primaryArea} · {tw.phone}
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-bold text-zinc-900 dark:text-white tabular-nums">
                      ৳{tw.wallet.totalEarnings.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 font-bold text-emerald-600 tabular-nums">
                      ৳{tw.wallet.availableBalance.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 font-black text-orange-600 tabular-nums">
                      ৳{tw.wallet.withdrawableBalance.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 font-bold text-blue-600 tabular-nums">
                      ৳{tw.wallet.totalWithdrawn.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 font-bold text-rose-600 tabular-nums">
                      ৳{tw.wallet.cashPending.toLocaleString()}
                    </td>
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => void handleToggleRestriction(tw.id, !tw.wallet.bookingRestricted)}
                        className={`px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer ${
                          tw.wallet.bookingRestricted
                            ? 'bg-rose-500/20 text-rose-600'
                            : 'bg-emerald-500/15 text-emerald-600'
                        }`}
                      >
                        {tw.wallet.bookingRestricted ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                        <span>
                          {tw.wallet.bookingRestricted
                            ? isBangla
                              ? 'সীমাবদ্ধ'
                              : 'Restricted'
                            : isBangla
                              ? 'সক্রিয়'
                              : 'Active'}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          placeholder={String(tw.wallet.reservedBalance)}
                          value={reserveInputs[tw.id] ?? ''}
                          onChange={(e) => setReserveInputs({ ...reserveInputs, [tw.id]: e.target.value })}
                          className="w-16 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-[11px] tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveReserve(tw.id)}
                          className="px-2 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold cursor-pointer"
                        >
                          {isBangla ? 'সেট' : 'Set'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: BOOKING LEDGER */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isBangla ? 'বুকিং, গ্রাহক বা টেকনিশিয়ান খুঁজুন...' : 'Search booking, customer, technician...'}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 font-bold"
            >
              <option value="">{isBangla ? 'সকল পেমেন্ট অবস্থা' : 'All Payment Status'}</option>
              <option value="PAID">{isBangla ? 'পরিশোধিত (PAID)' : 'PAID'}</option>
              <option value="PENDING_APPROVAL">{isBangla ? 'এসক্রো অপেক্ষমাণ' : 'PENDING_APPROVAL'}</option>
              <option value="PENDING">{isBangla ? 'বাকি (PENDING)' : 'PENDING'}</option>
              <option value="CASH_ON_SERVICE">{isBangla ? 'কাজ শেষে নগদ' : 'CASH_ON_SERVICE'}</option>
              <option value="REFUNDED">{isBangla ? 'রিফান্ডকৃত' : 'REFUNDED'}</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={() => void loadOverview()}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold cursor-pointer"
            >
              {isBangla ? 'রিফ্রেশ' : 'Refresh'}
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <th className="py-2 pr-3">{isBangla ? 'বুকিং' : 'Booking'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'গ্রাহক / টেকনিশিয়ান' : 'Customer / Tech'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'মাধ্যম ও অবস্থা' : 'Method & Status'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'চূড়ান্ত মোট' : 'Final Total'}</th>
                  <th className="py-2 pr-3">{isBangla ? 'Servexa (১০%)' : 'Servexa (10%)'}</th>
                  <th className="py-2">{isBangla ? 'টেকনিশিয়ান (৯০%)' : 'Tech (90%)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {transactions.map((tx) => (
                  <tr key={tx.bookingId}>
                    <td className="py-3 pr-3 font-mono font-bold text-orange-600">#{tx.bookingNumber}</td>
                    <td className="py-3 pr-3">
                      <div className="font-bold">{tx.customerName}</div>
                      <div className="text-[11px] text-zinc-400">
                        {isBangla ? 'টেকনিশিয়ান:' : 'Tech:'} {tx.technicianName}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="uppercase font-bold">{tx.paymentMethod}</span> ·{' '}
                      <span className="font-semibold text-emerald-600">{formatPaymentStatus(tx.paymentStatus)}</span>
                    </td>
                    <td className="py-3 pr-3 font-black tabular-nums">৳{tx.finalAgreedAmount ?? '—'}</td>
                    <td className="py-3 pr-3 font-bold text-emerald-600 tabular-nums">
                      ৳{tx.platformCommissionAmount ?? 0}
                    </td>
                    <td className="py-3 font-bold text-orange-600 tabular-nums">৳{tx.technicianEarningsAmount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
