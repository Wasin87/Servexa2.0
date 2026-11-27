import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  handleFirestoreError,
  OperationType,
  saveNotificationToFirestore,
  updateBookingInFirestore,
} from './firestoreService';
import type {
  AdditionalChargeRequest,
  AdminAuditLog,
  AdminFinancialSummary,
  CashCollectionRecord,
  PaymentMethodCode,
  PaymentTransaction,
  PayoutAccount,
  PayoutProvider,
  PlatformRules,
  PricingRule,
  ServiceSubcategory,
  TechnicianServiceConfig,
  WalletLedgerEntry,
  WalletSummary,
  WithdrawalRequest,
} from '../types/finance';
import type { Booking, Technician } from '../types';

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

const roundBDT = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/* -------------------------------------------------------------------------- */
/* Real-time Firestore Subscriptions                                          */
/* -------------------------------------------------------------------------- */

export function subscribeToFinanceTransactions(
  onUpdate: (items: PaymentTransaction[]) => void,
  bookingId?: string
) {
  const colRef = bookingId
    ? query(collection(db, 'financeTransactions'), where('bookingId', '==', bookingId))
    : collection(db, 'financeTransactions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PaymentTransaction[] = [];
      snapshot.forEach((d) => list.push(d.data() as PaymentTransaction));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'financeTransactions')
  );
}

export function subscribeToWalletLedger(
  onUpdate: (items: WalletLedgerEntry[]) => void,
  technicianId?: string
) {
  const colRef = technicianId
    ? query(collection(db, 'walletLedger'), where('technicianId', '==', technicianId))
    : collection(db, 'walletLedger');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: WalletLedgerEntry[] = [];
      snapshot.forEach((d) => list.push(d.data() as WalletLedgerEntry));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'walletLedger')
  );
}

export function subscribeToWithdrawals(
  onUpdate: (items: WithdrawalRequest[]) => void,
  technicianId?: string
) {
  const colRef = technicianId
    ? query(collection(db, 'withdrawals'), where('technicianId', '==', technicianId))
    : collection(db, 'withdrawals');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: WithdrawalRequest[] = [];
      snapshot.forEach((d) => list.push(d.data() as WithdrawalRequest));
      list.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'withdrawals')
  );
}

export function subscribeToPayoutAccounts(
  onUpdate: (items: PayoutAccount[]) => void,
  technicianId?: string
) {
  const colRef = technicianId
    ? query(collection(db, 'payoutAccounts'), where('technicianId', '==', technicianId))
    : collection(db, 'payoutAccounts');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PayoutAccount[] = [];
      snapshot.forEach((d) => list.push(d.data() as PayoutAccount));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'payoutAccounts')
  );
}

export function subscribeToCashCollections(
  onUpdate: (items: CashCollectionRecord[]) => void,
  technicianId?: string
) {
  const colRef = technicianId
    ? query(collection(db, 'cashCollections'), where('technicianId', '==', technicianId))
    : collection(db, 'cashCollections');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: CashCollectionRecord[] = [];
      snapshot.forEach((d) => list.push(d.data() as CashCollectionRecord));
      list.sort((a, b) => new Date(b.collectedAt || 0).getTime() - new Date(a.collectedAt || 0).getTime());
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'cashCollections')
  );
}

/* -------------------------------------------------------------------------- */
/* Ledger-Derived Wallet & Admin Summary Calculators                          */
/* -------------------------------------------------------------------------- */

export function computeWalletFromFirestoreRecords(
  technicianId: string,
  allLedger: WalletLedgerEntry[],
  allWithdrawals: WithdrawalRequest[],
  allCashCollections: CashCollectionRecord[],
  customReserveBalance = 0
): WalletSummary {
  const techLedger = allLedger.filter((l) => l.technicianId === technicianId);
  const techWithdrawals = allWithdrawals.filter((w) => w.technicianId === technicianId);
  const techCash = allCashCollections.filter((c) => c.technicianId === technicianId);

  let availCredit = 0;
  let pendingCredit = 0;
  let adjCredit = 0;
  let adjDebit = 0;
  let refundDebit = 0;

  for (const l of techLedger) {
    const amt = Number(l.amount || 0);
    if (l.entryType === 'EARNING_AVAILABLE' && l.direction === 'CREDIT') availCredit += amt;
    else if (l.entryType === 'EARNING_PENDING' && l.direction === 'CREDIT') pendingCredit += amt;
    else if (l.entryType === 'ADJUSTMENT_CREDIT') adjCredit += amt;
    else if (l.entryType === 'ADJUSTMENT_DEBIT') adjDebit += amt;
    else if (l.entryType === 'REFUND_DEBIT') refundDebit += amt;
  }

  let totalWithdrawn = 0;
  let lockedForWithdrawal = 0;
  for (const w of techWithdrawals) {
    const amt = Number(w.requestedAmount || 0);
    if (w.status === 'COMPLETED') {
      totalWithdrawn += amt;
    } else if (['PENDING', 'UNDER_REVIEW', 'PROCESSING'].includes(w.status)) {
      lockedForWithdrawal += amt;
    }
  }

  // Pending credits that were later released to available are subtracted if matching booking exists
  const availBookings = new Set(
    techLedger
      .filter((l) => l.entryType === 'EARNING_AVAILABLE' && l.bookingId)
      .map((l) => l.bookingId)
  );
  const netPending = techLedger
    .filter((l) => l.entryType === 'EARNING_PENDING' && (!l.bookingId || !availBookings.has(l.bookingId)))
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  const availableBalance = roundBDT(
    Math.max(0, availCredit + adjCredit - totalWithdrawn - lockedForWithdrawal - refundDebit - adjDebit)
  );
  const reservedBalance = roundBDT(Math.max(0, customReserveBalance));
  const withdrawableBalance = roundBDT(Math.max(0, availableBalance - reservedBalance));

  const cashPending = roundBDT(
    techCash
      .filter((c) => !['COMMISSION_RECORDED', 'PAYMENT_VERIFIED', 'EARNINGS_CREDITED'].includes(c.status))
      .reduce((s, c) => s + Number(c.amountCollected || 0), 0)
  );
  const commissionDue = roundBDT(
    techCash
      .filter((c) => !['COMMISSION_RECORDED', 'PAYMENT_VERIFIED', 'EARNINGS_CREDITED'].includes(c.status))
      .reduce((s, c) => s + Number(c.commissionAmount || 0), 0)
  );

  return {
    technicianId,
    currency: 'BDT',
    totalEarnings: roundBDT(availCredit + netPending),
    pendingEarnings: roundBDT(netPending),
    availableBalance,
    reservedBalance,
    lockedForWithdrawal: roundBDT(lockedForWithdrawal),
    withdrawableBalance,
    cashPending,
    commissionDue,
    totalWithdrawn: roundBDT(totalWithdrawn),
    customReserveBalance: customReserveBalance || null,
    bookingRestricted: techCash.some((c) => c.status === 'OVERDUE' && c.bookingRestrictedApplied),
    restrictionReason: null,
    updatedAt: new Date().toISOString(),
  };
}

export function computeAdminSummaryFromFirestore(
  technicians: Technician[],
  paymentTxs: PaymentTransaction[],
  ledger: WalletLedgerEntry[],
  withdrawals: WithdrawalRequest[],
  cashCollections: CashCollectionRecord[]
): AdminFinancialSummary {
  const techWallets = technicians.map((t) =>
    computeWalletFromFirestoreRecords(t.id, ledger, withdrawals, cashCollections, 0)
  );

  const verifiedOnlineTxs = paymentTxs.filter((tx) => tx.status === 'VERIFIED' || tx.status === 'REFUNDED');
  const pendingEscrowTxs = paymentTxs.filter(
    (tx) => tx.status === 'PENDING_ADMIN_APPROVAL' || tx.status === 'PENDING' || tx.status === 'PROCESSING'
  );

  const totalOnlineCollections = roundBDT(
    verifiedOnlineTxs.reduce((s, tx) => s + Math.max(0, Number(tx.amount || 0) - Number(tx.refundedAmount || 0)), 0)
  );
  const pendingEscrowAmount = roundBDT(
    pendingEscrowTxs.reduce((s, tx) => s + Number(tx.amount || 0), 0)
  );

  const totalPlatformCommission = roundBDT(
    ledger
      .filter((l) => l.entryType === 'COMMISSION_DEDUCTED')
      .reduce((s, l) => s + Number(l.amount || 0), 0)
  );

  const totalTechnicianEarnings = roundBDT(techWallets.reduce((s, w) => s + w.totalEarnings, 0));
  const pendingTechnicianEarnings = roundBDT(techWallets.reduce((s, w) => s + w.pendingEarnings, 0));
  const availableTechnicianEarnings = roundBDT(techWallets.reduce((s, w) => s + w.availableBalance, 0));
  const totalReservedBalance = roundBDT(techWallets.reduce((s, w) => s + w.reservedBalance, 0));
  const totalWithdrawableBalance = roundBDT(techWallets.reduce((s, w) => s + w.withdrawableBalance, 0));

  const verifiedCashAmount = roundBDT(
    cashCollections
      .filter((c) => ['COMMISSION_RECORDED', 'PAYMENT_VERIFIED', 'EARNINGS_CREDITED'].includes(c.status))
      .reduce((s, c) => s + Number(c.amountCollected || 0), 0)
  );

  return {
    totalPlatformRevenue: roundBDT(totalOnlineCollections + verifiedCashAmount),
    totalPlatformCommission,
    totalTechnicianEarnings,
    pendingTechnicianEarnings,
    availableTechnicianEarnings,
    totalReservedBalance,
    totalWithdrawableBalance,
    totalWithdrawalRequestsCount: withdrawals.length,
    totalWithdrawalRequestedAmount: roundBDT(withdrawals.reduce((s, w) => s + Number(w.requestedAmount || 0), 0)),
    completedWithdrawalsCount: withdrawals.filter((w) => w.status === 'COMPLETED').length,
    completedWithdrawalsAmount: roundBDT(
      withdrawals.filter((w) => w.status === 'COMPLETED').reduce((s, w) => s + Number(w.netPayoutAmount || w.requestedAmount || 0), 0)
    ),
    failedWithdrawalsCount: withdrawals.filter((w) => ['FAILED', 'REJECTED', 'REVERSED'].includes(w.status)).length,
    failedWithdrawalsAmount: roundBDT(
      withdrawals.filter((w) => ['FAILED', 'REJECTED', 'REVERSED'].includes(w.status)).reduce((s, w) => s + Number(w.requestedAmount || 0), 0)
    ),
    pendingWithdrawalsCount: withdrawals.filter((w) => ['PENDING', 'UNDER_REVIEW', 'PROCESSING'].includes(w.status)).length,
    pendingWithdrawalsAmount: roundBDT(
      withdrawals.filter((w) => ['PENDING', 'UNDER_REVIEW', 'PROCESSING'].includes(w.status)).reduce((s, w) => s + Number(w.requestedAmount || 0), 0)
    ),
    totalOnlineCollections,
    cashCollectedByTechnicians: roundBDT(cashCollections.reduce((s, c) => s + Number(c.amountCollected || 0), 0)),
    cashPendingDeposits: roundBDT(
      cashCollections
        .filter((c) => !['COMMISSION_RECORDED', 'PAYMENT_VERIFIED', 'EARNINGS_CREDITED'].includes(c.status))
        .reduce((s, c) => s + Number(c.amountCollected || 0), 0)
    ),
    verifiedCashDeposits: verifiedCashAmount,
    overdueCashDeposits: roundBDT(
      cashCollections.filter((c) => c.status === 'OVERDUE').reduce((s, c) => s + Number(c.amountCollected || 0), 0)
    ),
    outstandingCommissionDues: roundBDT(techWallets.reduce((s, w) => s + w.commissionDue, 0)),
    totalRefundsAmount: roundBDT(paymentTxs.reduce((s, tx) => s + Number(tx.refundedAmount || 0), 0)),
    totalAdjustmentsNet: 0,
    pendingEscrowAmount,
    pendingEscrowCount: pendingEscrowTxs.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Demo Online Banking Escrow -> Admin Accept -> 90% Tech / 10% Admin         */
/* -------------------------------------------------------------------------- */

export async function submitDemoOnlinePaymentToFirestore(params: {
  booking: Booking;
  method: PaymentMethodCode;
  amount: number;
  bankOrProviderName: string;
  senderAccount: string;
  customerId: string;
  customerName: string;
  providerTxId?: string;
}): Promise<PaymentTransaction> {
  const { booking, method, amount, bankOrProviderName, senderAccount, customerId, customerName } = params;
  const now = new Date().toISOString();
  const cleanAmount = roundBDT(amount);
  const commissionAmount = roundBDT(cleanAmount * 0.1);
  const technicianAmount = roundBDT(cleanAmount - commissionAmount);
  const maskedAccount =
    senderAccount.length > 4
      ? `${senderAccount.slice(0, 3)}****${senderAccount.slice(-3)}`
      : senderAccount;

  const txId = `ptx-${Date.now()}`;
  const providerTxId =
    params.providerTxId ||
    `SRV-${method.toUpperCase()}-${Date.now().toString().slice(-6)}`;

  const tx: PaymentTransaction = {
    id: txId,
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    customerId: customerId || booking.customerId,
    customerName: customerName || booking.customerName,
    technicianId: booking.technicianId,
    technicianName: booking.technicianName,
    method,
    amount: cleanAmount,
    commissionPercent: 10,
    commissionAmount,
    technicianAmount,
    bankOrProviderName,
    senderAccountMasked: maskedAccount,
    currency: 'BDT',
    status: 'PENDING_ADMIN_APPROVAL',
    providerTxId,
    providerStatus: 'IN_ADMIN_ESCROW',
    providerMode: 'SANDBOX',
    idempotencyKey: `${booking.id}-${method}-${Date.now()}`,
    createdAt: now,
    refundedAmount: 0,
  };

  try {
    await setDoc(doc(db, 'financeTransactions', tx.id), stripUndefined(tx));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `financeTransactions/${tx.id}`);
    throw err;
  }

  await updateBookingInFirestore(booking.id, {
    paymentMethod: method,
    paymentStatus: 'PENDING_APPROVAL',
    finalTotal: cleanAmount,
    updatedAt: now,
  });

  // Real-time notifications: Admin & Technician
  await Promise.all([
    saveNotificationToFirestore({
      id: `notif-pay-admin-${Date.now()}`,
      userId: 'ADMIN_BROADCAST',
      role: 'ADMIN',
      titleEn: `New Online Payment Awaiting Approval (৳${cleanAmount})`,
      titleBn: `💳 নতুন অনলাইন পেমেন্ট অ্যাপ্রুভালের অপেক্ষায় (৳${cleanAmount})`,
      messageEn: `${tx.customerName} sent ৳${cleanAmount} via ${bankOrProviderName} (${providerTxId}) for #${booking.bookingNumber}. Accept to credit ৳${technicianAmount} (90%) to ${booking.technicianName}.`,
      messageBn: `${tx.customerName} #${booking.bookingNumber} কাজের জন্য ${bankOrProviderName} মাধ্যমে ৳${cleanAmount} পাঠিয়েছেন (${providerTxId})। একসেপ্ট করলে ৯০% (৳${technicianAmount}) টেকনিশিয়ানের ওয়ালেটে জমা হবে।`,
      type: 'payment',
      link: '/admin/dashboard?tab=finance',
      isRead: false,
      createdAt: now,
    }),
    booking.technicianId
      ? saveNotificationToFirestore({
          id: `notif-pay-tech-esc-${Date.now() + 1}`,
          userId: booking.technicianId,
          role: 'TECHNICIAN',
          titleEn: `Customer Submitted Online Payment (৳${cleanAmount})`,
          titleBn: `💳 গ্রাহক অনলাইন পেমেন্ট করেছেন (৳${cleanAmount})`,
          messageEn: `${tx.customerName} paid ৳${cleanAmount} for #${booking.bookingNumber}. Awaiting Admin acceptance — 90% (৳${technicianAmount}) will credit to your wallet.`,
          messageBn: `${tx.customerName} #${booking.bookingNumber} কাজের ৳${cleanAmount} অনলাইনে পাঠিয়েছেন। অ্যাডমিন একসেপ্ট করলেই ৯০% (৳${technicianAmount}) আপনার ওয়ালেটে যুক্ত হবে।`,
          type: 'payment',
          link: '/technician/dashboard?tab=earnings',
          isRead: false,
          createdAt: now,
        })
      : Promise.resolve(),
  ]);

  return tx;
}

export async function adminDecideOnlinePaymentInFirestore(params: {
  tx: PaymentTransaction;
  decision: 'APPROVE' | 'REJECT';
  adminId: string;
  adminName: string;
  note?: string;
}): Promise<void> {
  const { tx, decision, adminId, adminName, note } = params;
  const now = new Date().toISOString();
  const amount = roundBDT(tx.amount);
  const commissionAmount = roundBDT(tx.commissionAmount ?? amount * 0.1);
  const technicianAmount = roundBDT(tx.technicianAmount ?? amount - commissionAmount);

  if (decision === 'APPROVE') {
    await updateDoc(
      doc(db, 'financeTransactions', tx.id),
      stripUndefined({
        status: 'VERIFIED',
        providerStatus: 'ADMIN_ACCEPTED',
        verifiedAt: now,
        approvedBy: adminName,
        adminNote: note || 'Accepted by Admin & split 90/10',
      })
    );

    await updateBookingInFirestore(tx.bookingId, {
      paymentStatus: 'PAID',
      updatedAt: now,
    });

    // Idempotent deterministic ledger entries for 90% Tech / 10% Admin
    const availId = `led-avail-${tx.id}`;
    const commId = `led-comm-${tx.id}`;

    const availEntry: WalletLedgerEntry = {
      id: availId,
      technicianId: tx.technicianId,
      bookingId: tx.bookingId,
      paymentTxId: tx.id,
      entryType: 'EARNING_AVAILABLE',
      amount: technicianAmount,
      direction: 'CREDIT',
      description: `৯০% আয় জমা — অনলাইন পেমেন্ট গৃহীত (#${tx.bookingNumber || tx.bookingId})`,
      referenceKey: `PAY_AVAIL_${tx.id}`,
      createdBy: adminId,
      createdAt: now,
    };

    const commEntry: WalletLedgerEntry = {
      id: commId,
      technicianId: tx.technicianId,
      bookingId: tx.bookingId,
      paymentTxId: tx.id,
      entryType: 'COMMISSION_DEDUCTED',
      amount: commissionAmount,
      direction: 'DEBIT',
      description: `Servexa ১০% প্ল্যাটফর্ম কমিশন (#${tx.bookingNumber || tx.bookingId})`,
      referenceKey: `PAY_COMM_${tx.id}`,
      createdBy: adminId,
      createdAt: now,
    };

    await Promise.all([
      setDoc(doc(db, 'walletLedger', availId), stripUndefined(availEntry)),
      setDoc(doc(db, 'walletLedger', commId), stripUndefined(commEntry)),
      tx.technicianId
        ? saveNotificationToFirestore({
            id: `notif-pay-tech-ok-${Date.now()}`,
            userId: tx.technicianId,
            role: 'TECHNICIAN',
            titleEn: `৳${technicianAmount} Credited to Your Wallet!`,
            titleBn: `✅ ৳${technicianAmount} (৯০%) আপনার ওয়ালেটে জমা হয়েছে!`,
            messageEn: `Admin accepted online payment of ৳${amount} for #${tx.bookingNumber || tx.bookingId}. Your 90% share (৳${technicianAmount}) is now available for withdrawal.`,
            messageBn: `অ্যাডমিন #${tx.bookingNumber || tx.bookingId}-এর ৳${amount} অনলাইন পেমেন্ট গ্রহণ করেছেন। আপনার ৯০% অংশ ৳${technicianAmount} ওয়ালেটে জমা হয়েছে এবং এখন উত্তোলনযোগ্য।`,
            type: 'payment',
            link: '/technician/dashboard?tab=earnings',
            isRead: false,
            createdAt: now,
          })
        : Promise.resolve(),
      tx.customerId
        ? saveNotificationToFirestore({
            id: `notif-pay-cust-ok-${Date.now() + 1}`,
            userId: tx.customerId,
            role: 'CUSTOMER',
            titleEn: `Online Payment Approved (#${tx.bookingNumber || tx.bookingId})`,
            titleBn: `✅ আপনার অনলাইন পেমেন্ট অ্যাডমিন গ্রহণ করেছেন!`,
            messageEn: `Your ৳${amount} payment via ${(tx.bankOrProviderName || tx.method).toUpperCase()} has been verified & accepted by Servexa Admin.`,
            messageBn: `#${tx.bookingNumber || tx.bookingId}-এর জন্য আপনার ৳${amount} পেমেন্ট (${tx.providerTxId || tx.method.toUpperCase()}) অ্যাডমিন যাচাই করে গ্রহণ করেছেন।`,
            type: 'payment',
            link: `/booking/${tx.bookingId}`,
            isRead: false,
            createdAt: now,
          })
        : Promise.resolve(),
    ]);
  } else {
    const reason = note || 'Payment could not be verified by Admin';
    await updateDoc(
      doc(db, 'financeTransactions', tx.id),
      stripUndefined({
        status: 'REJECTED',
        providerStatus: 'ADMIN_REJECTED',
        rejectedAt: now,
        failureReason: reason,
        approvedBy: adminName,
        adminNote: reason,
      })
    );

    await updateBookingInFirestore(tx.bookingId, {
      paymentStatus: 'PENDING',
      updatedAt: now,
    });

    await Promise.all([
      tx.customerId
        ? saveNotificationToFirestore({
            id: `notif-pay-cust-rej-${Date.now()}`,
            userId: tx.customerId,
            role: 'CUSTOMER',
            titleEn: `Payment Rejected (#${tx.bookingNumber || tx.bookingId})`,
            titleBn: `⚠️ অনলাইন পেমেন্ট প্রত্যাখ্যাত হয়েছে`,
            messageEn: `Admin rejected payment ${tx.providerTxId || tx.id}. Reason: ${reason}. Please try again.`,
            messageBn: `#${tx.bookingNumber || tx.bookingId}-এর ৳${amount} পেমেন্ট যাচাইয়ে গৃহীত হয়নি (${reason})। অনুগ্রহ করে আবার চেষ্টা করুন।`,
            type: 'payment',
            link: `/booking/${tx.bookingId}`,
            isRead: false,
            createdAt: now,
          })
        : Promise.resolve(),
      tx.technicianId
        ? saveNotificationToFirestore({
            id: `notif-pay-tech-rej-${Date.now() + 1}`,
            userId: tx.technicianId,
            role: 'TECHNICIAN',
            titleEn: `Payment Rejected by Admin (#${tx.bookingNumber || tx.bookingId})`,
            titleBn: `⚠️ অনলাইন পেমেন্ট বাতিল করা হয়েছে`,
            messageEn: `Customer payment ${tx.providerTxId || tx.id} was rejected by Admin.`,
            messageBn: `#${tx.bookingNumber || tx.bookingId}-এর অনলাইন পেমেন্ট অ্যাডমিন কর্তৃক বাতিল হয়েছে।`,
            type: 'payment',
            link: '/technician/dashboard?tab=earnings',
            isRead: false,
            createdAt: now,
          })
        : Promise.resolve(),
    ]);
  }
}

/* -------------------------------------------------------------------------- */
/* Payout Accounts & Real-Time Withdrawals                                    */
/* -------------------------------------------------------------------------- */

export async function addPayoutAccountToFirestore(params: {
  technicianId: string;
  technicianName: string;
  provider: PayoutProvider;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
}): Promise<PayoutAccount> {
  const now = new Date().toISOString();
  const acct: PayoutAccount = {
    id: `pa-${Date.now()}`,
    technicianId: params.technicianId,
    provider: params.provider,
    accountTitle: params.accountTitle.trim(),
    accountNumber: params.accountNumber.trim(),
    bankName: params.bankName?.trim() || null,
    branchName: params.branchName?.trim() || null,
    routingNumber: params.routingNumber?.trim() || null,
    verificationStatus: 'PENDING',
    isDefault: false,
    createdAt: now,
  };

  await setDoc(doc(db, 'payoutAccounts', acct.id), stripUndefined(acct));

  await saveNotificationToFirestore({
    id: `notif-pa-admin-${Date.now()}`,
    userId: 'ADMIN_BROADCAST',
    role: 'ADMIN',
    titleEn: `New Payout Account KYC (${params.provider.toUpperCase()})`,
    titleBn: `🏦 নতুন পেআউট অ্যাকাউন্ট KYC আবেদন`,
    messageEn: `${params.technicianName} added ${params.provider.toUpperCase()} account (${params.accountNumber}) for KYC verification.`,
    messageBn: `${params.technicianName} নতুন ${params.provider.toUpperCase()} পেআউট অ্যাকাউন্ট (${params.accountNumber}) যুক্ত করেছেন। যাচাই করুন।`,
    type: 'payment',
    link: '/admin/dashboard?tab=finance',
    isRead: false,
    createdAt: now,
  });

  return acct;
}

export async function verifyPayoutAccountInFirestore(
  account: PayoutAccount,
  status: 'VERIFIED' | 'REJECTED',
  note?: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(
    doc(db, 'payoutAccounts', account.id),
    stripUndefined({
      verificationStatus: status,
      verificationNote: note || null,
      verifiedAt: status === 'VERIFIED' ? now : null,
    })
  );

  await saveNotificationToFirestore({
    id: `notif-pa-tech-${Date.now()}`,
    userId: account.technicianId,
    role: 'TECHNICIAN',
    titleEn: status === 'VERIFIED' ? 'Payout Account Verified!' : 'Payout Account Rejected',
    titleBn:
      status === 'VERIFIED'
        ? `✅ আপনার ${account.provider.toUpperCase()} পেআউট অ্যাকাউন্ট যাচাই সম্পন্ন হয়েছে`
        : `⚠️ আপনার ${account.provider.toUpperCase()} পেআউট অ্যাকাউন্ট বাতিল হয়েছে`,
    messageEn:
      status === 'VERIFIED'
        ? `Your ${account.provider.toUpperCase()} (${account.accountNumber}) account is verified by Admin.`
        : `Admin rejected ${account.provider.toUpperCase()} (${account.accountNumber}). ${note || ''}`,
    messageBn:
      status === 'VERIFIED'
        ? `অ্যাডমিন আপনার ${account.provider.toUpperCase()} অ্যাকাউন্ট (${account.accountNumber}) যাচাই করেছেন।`
        : `অ্যাডমিন আপনার ${account.provider.toUpperCase()} অ্যাকাউন্ট (${account.accountNumber}) অনুমোদন করেননি।`,
    type: 'payment',
    link: '/technician/dashboard?tab=earnings',
    isRead: false,
    createdAt: now,
  });
}

export async function requestWithdrawalInFirestore(params: {
  technicianId: string;
  technicianName: string;
  payoutAccount: PayoutAccount;
  amount: number;
  withdrawableBalance: number;
  minWithdrawal?: number;
}): Promise<WithdrawalRequest> {
  const { technicianId, technicianName, payoutAccount, amount, withdrawableBalance, minWithdrawal = 50 } = params;
  const cleanAmount = roundBDT(amount);
  if (!Number.isFinite(cleanAmount) || cleanAmount < minWithdrawal) {
    throw new Error(`সর্বনিম্ন উত্তোলন পরিমাণ ৳${minWithdrawal}।`);
  }
  if (cleanAmount > withdrawableBalance) {
    throw new Error(`অপর্যাপ্ত ব্যালেন্স! সর্বোচ্চ উত্তোলনযোগ্য ৳${withdrawableBalance}।`);
  }

  const now = new Date().toISOString();
  const wId = `wdr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const acctNum = payoutAccount.accountNumber || '';
  const masked = acctNum.length > 4 ? `${'*'.repeat(Math.max(0, acctNum.length - 4))}${acctNum.slice(-4)}` : acctNum;

  const withdrawal: WithdrawalRequest = {
    id: wId,
    technicianId,
    technicianName,
    payoutAccountId: payoutAccount.id,
    provider: payoutAccount.provider,
    accountNumberMasked: masked,
    requestedAmount: cleanAmount,
    feeAmount: 0,
    netPayoutAmount: cleanAmount,
    status: 'PENDING',
    idempotencyKey: `${technicianId}-${wId}`,
    requestedAt: now,
  };

  const holdEntry: WalletLedgerEntry = {
    id: `led-wres-${wId}`,
    technicianId,
    withdrawalId: wId,
    entryType: 'WITHDRAWAL_RESERVED',
    amount: cleanAmount,
    direction: 'HOLD',
    description: `উত্তোলনের আবেদন সংরক্ষিত (${payoutAccount.provider.toUpperCase()} ${masked})`,
    referenceKey: `WDR_RES_${wId}`,
    createdBy: technicianId,
    createdAt: now,
  };

  await Promise.all([
    setDoc(doc(db, 'withdrawals', wId), stripUndefined(withdrawal)),
    setDoc(doc(db, 'walletLedger', holdEntry.id), stripUndefined(holdEntry)),
    saveNotificationToFirestore({
      id: `notif-wdr-admin-${Date.now()}`,
      userId: 'ADMIN_BROADCAST',
      role: 'ADMIN',
      titleEn: `New Withdrawal Request (৳${cleanAmount})`,
      titleBn: `💸 নতুন টাকা উত্তোলনের আবেদন (৳${cleanAmount})`,
      messageEn: `${technicianName} requested ৳${cleanAmount} payout via ${payoutAccount.provider.toUpperCase()} (${masked}).`,
      messageBn: `${technicianName} তার ওয়ালেট থেকে ${payoutAccount.provider.toUpperCase()} (${masked}) অ্যাকাউন্টে ৳${cleanAmount} উত্তোলনের আবেদন করেছেন।`,
      type: 'payment',
      link: '/admin/dashboard?tab=finance',
      isRead: false,
      createdAt: now,
    }),
  ]);

  return withdrawal;
}

export async function adminProcessWithdrawalInFirestore(params: {
  withdrawal: WithdrawalRequest;
  action: 'UNDER_REVIEW' | 'PROCESSING' | 'COMPLETE' | 'FAIL' | 'REJECT' | 'REVERSE';
  adminId: string;
  providerReference?: string;
  note?: string;
}): Promise<void> {
  const { withdrawal, action, adminId, providerReference, note } = params;
  const now = new Date().toISOString();

  if (action === 'COMPLETE') {
    const ref = (providerReference || '').trim();
    if (ref.length < 4) {
      throw new Error('উত্তোলন সম্পন্ন করতে কমপক্ষে ৪ অক্ষরের পে-আউট TrxID দিন।');
    }
    await updateDoc(
      doc(db, 'withdrawals', withdrawal.id),
      stripUndefined({
        status: 'COMPLETED',
        providerReference: ref,
        adminNote: note || 'Settled by Admin',
        processedAt: now,
        processedBy: adminId,
      })
    );

    const compLedger: WalletLedgerEntry = {
      id: `led-wcomp-${withdrawal.id}`,
      technicianId: withdrawal.technicianId,
      withdrawalId: withdrawal.id,
      entryType: 'WITHDRAWAL_COMPLETED',
      amount: withdrawal.requestedAmount,
      direction: 'DEBIT',
      description: `টাকা উত্তোলন সম্পন্ন (${withdrawal.provider.toUpperCase()} Ref: ${ref})`,
      referenceKey: `WDR_COMP_${withdrawal.id}`,
      createdBy: adminId,
      createdAt: now,
    };
    await setDoc(doc(db, 'walletLedger', compLedger.id), stripUndefined(compLedger));

    await saveNotificationToFirestore({
      id: `notif-wdr-tech-ok-${Date.now()}`,
      userId: withdrawal.technicianId,
      role: 'TECHNICIAN',
      titleEn: `Withdrawal Completed (৳${withdrawal.requestedAmount})`,
      titleBn: `✅ আপনার ৳${withdrawal.requestedAmount} উত্তোলন সম্পন্ন হয়েছে!`,
      messageEn: `Admin sent ৳${withdrawal.netPayoutAmount} via ${withdrawal.provider.toUpperCase()} (${withdrawal.accountNumberMasked}). Ref: ${ref}`,
      messageBn: `অ্যাডমিন আপনার ${withdrawal.provider.toUpperCase()} (${withdrawal.accountNumberMasked}) অ্যাকাউন্টে ৳${withdrawal.netPayoutAmount} পাঠিয়ে দিয়েছেন। Ref: ${ref}`,
      type: 'payment',
      link: '/technician/dashboard?tab=earnings',
      isRead: false,
      createdAt: now,
    });
  } else if (action === 'PROCESSING' || action === 'UNDER_REVIEW') {
    await updateDoc(
      doc(db, 'withdrawals', withdrawal.id),
      stripUndefined({ status: action, adminNote: note || null })
    );
    await saveNotificationToFirestore({
      id: `notif-wdr-tech-proc-${Date.now()}`,
      userId: withdrawal.technicianId,
      role: 'TECHNICIAN',
      titleEn: `Withdrawal ${action === 'PROCESSING' ? 'Processing' : 'Under Review'}`,
      titleBn: `⏳ আপনার ৳${withdrawal.requestedAmount} উত্তোলন প্রসেসিং চলছে`,
      messageEn: `Admin is processing your ৳${withdrawal.requestedAmount} withdrawal request.`,
      messageBn: `অ্যাডমিন আপনার ৳${withdrawal.requestedAmount} উত্তোলনের আবেদন প্রসেসিং করছেন।`,
      type: 'payment',
      link: '/technician/dashboard?tab=earnings',
      isRead: false,
      createdAt: now,
    });
  } else {
    const nextStatus = action === 'FAIL' ? 'FAILED' : action === 'REJECT' ? 'REJECTED' : 'REVERSED';
    await updateDoc(
      doc(db, 'withdrawals', withdrawal.id),
      stripUndefined({
        status: nextStatus,
        failureReason: note || `${nextStatus} by Admin`,
        processedAt: now,
        processedBy: adminId,
      })
    );

    const restLedger: WalletLedgerEntry = {
      id: `led-wrest-${withdrawal.id}`,
      technicianId: withdrawal.technicianId,
      withdrawalId: withdrawal.id,
      entryType: 'WITHDRAWAL_RESTORED',
      amount: withdrawal.requestedAmount,
      direction: 'RELEASE',
      description: `উত্তোলন ${nextStatus} হওয়ায় অর্থ ওয়ালেটে ফেরত`,
      referenceKey: `WDR_REST_${withdrawal.id}`,
      createdBy: adminId,
      createdAt: now,
    };
    await setDoc(doc(db, 'walletLedger', restLedger.id), stripUndefined(restLedger));

    await saveNotificationToFirestore({
      id: `notif-wdr-tech-fail-${Date.now()}`,
      userId: withdrawal.technicianId,
      role: 'TECHNICIAN',
      titleEn: `Withdrawal ${nextStatus} — Funds Restored`,
      titleBn: `⚠️ উত্তোলন ${nextStatus === 'REJECTED' ? 'বাতিল' : 'ফেরত'} — অর্থ ওয়ালেটে ফেরত এসেছে`,
      messageEn: `Your ৳${withdrawal.requestedAmount} withdrawal was ${nextStatus.toLowerCase()} and restored to your wallet.`,
      messageBn: `৳${withdrawal.requestedAmount} উত্তোলন আবেদন ${nextStatus} হওয়ায় সম্পূর্ণ অর্থ আবার আপনার ওয়ালেটে যোগ হয়েছে।`,
      type: 'payment',
      link: '/technician/dashboard?tab=earnings',
      isRead: false,
      createdAt: now,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Cash-on-Completion Real-Time Firestore Sync                                */
/* -------------------------------------------------------------------------- */

export async function recordCashCollectionInFirestore(booking: Booking): Promise<CashCollectionRecord> {
  const existingQ = query(collection(db, 'cashCollections'), where('bookingId', '==', booking.id));
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    return existingSnap.docs[0].data() as CashCollectionRecord;
  }

  const now = new Date();
  const amount = roundBDT(booking.finalTotal || booking.estimatedTotalMax || 650);
  const comm = roundBDT(amount * 0.1);
  const record: CashCollectionRecord = {
    id: `cc-${booking.id}`,
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    technicianId: booking.technicianId,
    technicianName: booking.technicianName,
    customerId: booking.customerId,
    amountCollected: amount,
    commissionAmount: comm,
    technicianShareAmount: roundBDT(amount - comm),
    status: 'CASH_PENDING',
    collectedAt: now.toISOString(),
    deadlineAt: new Date(now.getTime() + 48 * 3600_000).toISOString(),
    graceEndsAt: new Date(now.getTime() + 60 * 3600_000).toISOString(),
    reminderCount: 0,
    bookingRestrictedApplied: false,
    deposit: null,
  };

  await setDoc(doc(db, 'cashCollections', record.id), stripUndefined(record));

  await saveNotificationToFirestore({
    id: `notif-cc-admin-${Date.now()}`,
    userId: 'ADMIN_BROADCAST',
    role: 'ADMIN',
    titleEn: `Cash Collected (#${booking.bookingNumber})`,
    titleBn: `💵 টেকনিশিয়ান নগদ অর্থ সংগ্রহ করেছেন (#${booking.bookingNumber})`,
    messageEn: `${booking.technicianName} collected ৳${amount} cash for #${booking.bookingNumber} (Servexa 10%: ৳${comm}).`,
    messageBn: `${booking.technicianName} #${booking.bookingNumber} কাজে ৳${amount} নগদ সংগ্রহ করেছেন (Servexa ১০%: ৳${comm})।`,
    type: 'payment',
    link: '/admin/dashboard?tab=finance',
    isRead: false,
    createdAt: now.toISOString(),
  });

  return record;
}

export async function submitCashDepositInFirestore(
  cc: CashCollectionRecord,
  channel: string,
  depositReference: string,
  amountDeposited: number
): Promise<void> {
  const now = new Date().toISOString();
  const depId = `dep-${Date.now()}`;
  const updated: CashCollectionRecord = {
    ...cc,
    status: 'VERIFICATION_PENDING',
    deposit: {
      id: depId,
      cashCollectionId: cc.id,
      bookingId: cc.bookingId,
      technicianId: cc.technicianId,
      channel,
      depositReference,
      amountDeposited,
      status: 'VERIFICATION_PENDING',
      submittedAt: now,
    },
  };

  await setDoc(doc(db, 'cashCollections', cc.id), stripUndefined(updated));

  await saveNotificationToFirestore({
    id: `notif-dep-admin-${Date.now()}`,
    userId: 'ADMIN_BROADCAST',
    role: 'ADMIN',
    titleEn: `Cash Deposit Reference Submitted (#${cc.bookingNumber})`,
    titleBn: `🏦 নগদ জমার রেফারেন্স জমা হয়েছে (#${cc.bookingNumber})`,
    messageEn: `${cc.technicianName} submitted ${channel} ref "${depositReference}" for ৳${amountDeposited}.`,
    messageBn: `${cc.technicianName} #${cc.bookingNumber}-এর ৳${amountDeposited} ডিপোজিট রেফারেন্স (${depositReference}) যাচাইয়ের জন্য পাঠিয়েছেন।`,
    type: 'payment',
    link: '/admin/dashboard?tab=finance',
    isRead: false,
    createdAt: now,
  });
}

export async function adminVerifyCashDepositInFirestore(
  cc: CashCollectionRecord,
  decision: 'APPROVE' | 'REJECT' | 'DISPUTE',
  adminId: string,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  if (decision === 'APPROVE') {
    const updated: CashCollectionRecord = {
      ...cc,
      status: 'COMMISSION_RECORDED',
      deposit: cc.deposit
        ? { ...cc.deposit, status: 'COMMISSION_RECORDED', verifiedAt: now, verifiedBy: adminId }
        : null,
    };
    await setDoc(doc(db, 'cashCollections', cc.id), stripUndefined(updated));
    await updateBookingInFirestore(cc.bookingId, { paymentStatus: 'PAID', updatedAt: now });

    const availId = `led-cash-avail-${cc.id}`;
    const commId = `led-cash-comm-${cc.id}`;
    await Promise.all([
      setDoc(
        doc(db, 'walletLedger', availId),
        stripUndefined({
          id: availId,
          technicianId: cc.technicianId,
          bookingId: cc.bookingId,
          cashCollectionId: cc.id,
          entryType: 'EARNING_AVAILABLE',
          amount: cc.technicianShareAmount,
          direction: 'CREDIT',
          description: `নগদ সমন্বয় যাচাইকৃত — ৯০% অংশ (#${cc.bookingNumber})`,
          referenceKey: `CASH_AVAIL_${cc.id}`,
          createdBy: adminId,
          createdAt: now,
        })
      ),
      setDoc(
        doc(db, 'walletLedger', commId),
        stripUndefined({
          id: commId,
          technicianId: cc.technicianId,
          bookingId: cc.bookingId,
          cashCollectionId: cc.id,
          entryType: 'COMMISSION_DEDUCTED',
          amount: cc.commissionAmount,
          direction: 'DEBIT',
          description: `Servexa ১০% কমিশন (#${cc.bookingNumber})`,
          referenceKey: `CASH_COMM_${cc.id}`,
          createdBy: adminId,
          createdAt: now,
        })
      ),
      saveNotificationToFirestore({
        id: `notif-cash-tech-ok-${Date.now()}`,
        userId: cc.technicianId,
        role: 'TECHNICIAN',
        titleEn: `Cash Deposit Verified (#${cc.bookingNumber})`,
        titleBn: `✅ নগদ ডিপোজিট যাচাই সম্পন্ন (#${cc.bookingNumber})`,
        messageEn: `Admin verified your cash deposit and credited ৳${cc.technicianShareAmount} (90%) to your ledger.`,
        messageBn: `অ্যাডমিন #${cc.bookingNumber}-এর নগদ জমা যাচাই করে ৳${cc.technicianShareAmount} (৯০%) আপনার ওয়ালেটে ক্রেডিট করেছেন।`,
        type: 'payment',
        link: '/technician/dashboard?tab=earnings',
        isRead: false,
        createdAt: now,
      }),
    ]);
  } else {
    const nextStatus = decision === 'REJECT' ? 'REJECTED' : 'DISPUTED';
    const updated: CashCollectionRecord = {
      ...cc,
      status: nextStatus,
      disputeNote: reason || 'Mismatch during verification',
      deposit: cc.deposit
        ? { ...cc.deposit, status: nextStatus, rejectionReason: reason || 'Mismatch' }
        : null,
    };
    await setDoc(doc(db, 'cashCollections', cc.id), stripUndefined(updated));

    await saveNotificationToFirestore({
      id: `notif-cash-tech-rej-${Date.now()}`,
      userId: cc.technicianId,
      role: 'TECHNICIAN',
      titleEn: `Cash Deposit ${nextStatus} (#${cc.bookingNumber})`,
      titleBn: `⚠️ নগদ ডিপোজিট ${nextStatus === 'REJECTED' ? 'বাতিল' : 'বিতর্কিত'} (#${cc.bookingNumber})`,
      messageEn: `Admin marked your cash deposit for #${cc.bookingNumber} as ${nextStatus}.`,
      messageBn: `অ্যাডমিন #${cc.bookingNumber}-এর নগদ ডিপোজিট রেফারেন্স ${nextStatus === 'REJECTED' ? 'বাতিল' : 'বিতর্কিত'} করেছেন।`,
      type: 'payment',
      link: '/technician/dashboard?tab=earnings',
      isRead: false,
      createdAt: now,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Payout Account Delete                                                      */
/* -------------------------------------------------------------------------- */

export async function deletePayoutAccountFromFirestore(accountId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'payoutAccounts', accountId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `payoutAccounts/${accountId}`);
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Extra Work & Material Charges (Real-Time Firestore Sync)                   */
/* -------------------------------------------------------------------------- */

export function subscribeToExtraCharges(
  onUpdate: (items: AdditionalChargeRequest[]) => void,
  bookingId?: string
) {
  const colRef = bookingId
    ? query(collection(db, 'extraCharges'), where('bookingId', '==', bookingId))
    : collection(db, 'extraCharges');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AdditionalChargeRequest[] = [];
      snapshot.forEach((d) => list.push(d.data() as AdditionalChargeRequest));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'extraCharges')
  );
}

export async function saveExtraChargeToFirestore(charge: AdditionalChargeRequest): Promise<void> {
  try {
    await setDoc(doc(db, 'extraCharges', charge.id), stripUndefined(charge), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `extraCharges/${charge.id}`);
    throw error;
  }
}

export async function respondExtraChargeInFirestore(
  chargeId: string,
  decision: 'APPROVE' | 'REJECT',
  respondedBy: string
): Promise<void> {
  try {
    await updateDoc(
      doc(db, 'extraCharges', chargeId),
      stripUndefined({
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        respondedAt: new Date().toISOString(),
        respondedBy,
      })
    );
  } catch (error) {
    if ((error as { code?: string })?.code === 'not-found') return;
    handleFirestoreError(error, OperationType.UPDATE, `extraCharges/${chargeId}`);
  }
}

export async function deleteExtraChargeFromFirestore(chargeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'extraCharges', chargeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `extraCharges/${chargeId}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Platform Rules, Subcategories, Pricing Rules, Tech Services & Audit Logs   */
/* -------------------------------------------------------------------------- */

export function subscribeToPlatformRules(onUpdate: (rules: PlatformRules | null) => void) {
  return onSnapshot(
    doc(db, 'platformConfig', 'rules_current'),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as { rules?: PlatformRules };
        onUpdate(data.rules || null);
      } else {
        onUpdate(null);
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'platformConfig/rules_current')
  );
}

export async function savePlatformRulesToFirestore(
  rules: PlatformRules,
  updatedBy: string
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'platformConfig', 'rules_current'),
      stripUndefined({
        id: 'rules_current',
        rules,
        updatedAt: rules.updatedAt || new Date().toISOString(),
        updatedBy: updatedBy || rules.updatedBy || 'Admin',
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'platformConfig/rules_current');
  }
}

export function subscribeToSubcategories(onUpdate: (items: ServiceSubcategory[]) => void) {
  return onSnapshot(
    collection(db, 'subcategories'),
    (snapshot) => {
      const list: ServiceSubcategory[] = [];
      snapshot.forEach((d) => list.push(d.data() as ServiceSubcategory));
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'subcategories')
  );
}

export async function saveSubcategoryToFirestore(sub: ServiceSubcategory): Promise<void> {
  try {
    await setDoc(doc(db, 'subcategories', sub.id), stripUndefined(sub), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `subcategories/${sub.id}`);
  }
}

export async function deleteSubcategoryFromFirestore(subId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'subcategories', subId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `subcategories/${subId}`);
  }
}

export function subscribeToPricingRules(onUpdate: (items: PricingRule[]) => void) {
  return onSnapshot(
    collection(db, 'pricingRules'),
    (snapshot) => {
      const list: PricingRule[] = [];
      snapshot.forEach((d) => list.push(d.data() as PricingRule));
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'pricingRules')
  );
}

export async function savePricingRuleToFirestore(rule: PricingRule): Promise<void> {
  try {
    await setDoc(doc(db, 'pricingRules', rule.id), stripUndefined(rule), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `pricingRules/${rule.id}`);
  }
}

export async function deletePricingRuleFromFirestore(ruleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'pricingRules', ruleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `pricingRules/${ruleId}`);
  }
}

export function subscribeToTechnicianServices(
  onUpdate: (items: TechnicianServiceConfig[]) => void,
  technicianId?: string
) {
  const colRef = technicianId
    ? query(collection(db, 'technicianServices'), where('technicianId', '==', technicianId))
    : collection(db, 'technicianServices');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: TechnicianServiceConfig[] = [];
      snapshot.forEach((d) => list.push(d.data() as TechnicianServiceConfig));
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'technicianServices')
  );
}

export async function saveTechnicianServiceToFirestore(svc: TechnicianServiceConfig): Promise<void> {
  try {
    await setDoc(doc(db, 'technicianServices', svc.id), stripUndefined(svc), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `technicianServices/${svc.id}`);
  }
}

export async function deleteTechnicianServiceFromFirestore(svcId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'technicianServices', svcId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `technicianServices/${svcId}`);
  }
}

export function subscribeToAuditLogs(onUpdate: (items: AdminAuditLog[]) => void) {
  return onSnapshot(
    collection(db, 'auditLogs'),
    (snapshot) => {
      const list: AdminAuditLog[] = [];
      snapshot.forEach((d) => list.push(d.data() as AdminAuditLog));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.GET, 'auditLogs')
  );
}

export async function saveAuditLogToFirestore(log: AdminAuditLog): Promise<void> {
  try {
    const raw = log as unknown as Record<string, unknown>;
    const payload = {
      ...log,
      actorId: String(raw.actorId || log.adminId || 'admin'),
      actionType: String(raw.actionType || log.action || 'ADMIN_ACTION'),
      createdAt: log.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'auditLogs', log.id), stripUndefined(payload), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `auditLogs/${log.id}`);
  }
}

export async function submitManualCashDepositToAdminInFirestore(params: {
  technicianId: string;
  technicianName: string;
  customerName: string;
  customerPhone: string;
  channel: string;
  adminAccountNumber: string;
  depositReference: string;
  amountCollected: number;
}): Promise<CashCollectionRecord> {
  const { technicianId, technicianName, customerName, customerPhone, channel, adminAccountNumber, depositReference, amountCollected } = params;
  const now = new Date();
  const collectionId = `cc-manual-${Date.now()}`;
  const bookingId = `book-manual-${Date.now()}`;
  const bookingNumber = `MANUAL-${Math.floor(1000 + Math.random() * 9000)}`;
  const amount = Math.round((Number(amountCollected) || 0) * 100) / 100;
  const comm = Math.round(amount * 0.1 * 100) / 100;
  const techShare = Math.round((amount - comm) * 100) / 100;

  const record: CashCollectionRecord = {
    id: collectionId,
    bookingId,
    bookingNumber,
    technicianId,
    technicianName,
    customerId: 'cust-walkin',
    amountCollected: amount,
    commissionAmount: comm,
    technicianShareAmount: techShare,
    status: 'VERIFICATION_PENDING',
    collectedAt: now.toISOString(),
    deadlineAt: new Date(now.getTime() + 48 * 3600_000).toISOString(),
    graceEndsAt: new Date(now.getTime() + 60 * 3600_000).toISOString(),
    reminderCount: 0,
    bookingRestrictedApplied: false,
    deposit: {
      id: `dep-${Date.now()}`,
      cashCollectionId: collectionId,
      bookingId,
      technicianId,
      channel,
      depositReference,
      amountDeposited: amount,
      merchantAccountInfo: adminAccountNumber,
      status: 'VERIFICATION_PENDING',
      submittedAt: now.toISOString(),
    },
  };

  await setDoc(doc(db, 'cashCollections', record.id), stripUndefined(record));

  await saveNotificationToFirestore({
    id: `notif-manual-cash-admin-${Date.now()}`,
    userId: 'ADMIN_BROADCAST',
    role: 'ADMIN',
    titleEn: `Technician Cash Deposit to Admin (৳${amount})`,
    titleBn: `💵 টেকনিশিয়ান অ্যাডমিন অ্যাকাউন্টে নগদ জমা পাঠিয়েছেন (৳${amount})`,
    messageEn: `${technicianName} deposited ৳${amount} cash from customer ${customerName} (${customerPhone}) to Admin ${channel} (${adminAccountNumber}). Ref: ${depositReference}.`,
    messageBn: `${technicianName} গ্রাহক ${customerName} (${customerPhone})-এর থেকে সংগৃহীত ৳${amount} ক্যাশ অ্যাডমিন ${channel} (${adminAccountNumber}) নম্বরে পাঠিয়ে দিয়েছেন। TrxID: ${depositReference}। যাচাই করুন।`,
    type: 'payment',
    link: '/admin/dashboard?tab=cash',
    isRead: false,
    createdAt: now.toISOString(),
  });

  return record;
}

