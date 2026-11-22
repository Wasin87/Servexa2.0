import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  Smartphone,
  CreditCard,
  Lock,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { Booking } from '../../types';
import type { PaymentMethodCode, PaymentTransaction } from '../../types/finance';
import { useLanguage } from '../../contexts/LanguageContext';
import { submitDemoOnlinePaymentToFirestore } from '../../services/firestoreFinanceService';
import { initiatePayment, getStoredAuthToken } from '../../services/financeApi';

interface DemoPaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  amount: number;
  initialMethod?: PaymentMethodCode;
  customerId: string;
  customerName: string;
  activeMethods?: Record<PaymentMethodCode, boolean>;
  onSubmitted?: (tx: PaymentTransaction) => void;
}

const DEMO_BANKS = [
  'BRAC Bank PLC (Online Banking)',
  'Dutch-Bangla Bank (NexusPay / DBBL)',
  'The City Bank (Citytouch)',
  'Islami Bank Bangladesh (CellFin)',
  'Eastern Bank (EBL Skybanking)',
  'Visa / Mastercard (SSLCommerz Demo)',
];

export const DemoPaymentGatewayModal: React.FC<DemoPaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  booking,
  amount,
  initialMethod = 'bkash',
  customerId,
  customerName,
  activeMethods = { bkash: true, nagad: true, rocket: true, card: true, cash: true },
  onSubmitted,
}) => {
  const { isBangla } = useLanguage();
  const [method, setMethod] = useState<PaymentMethodCode>(
    initialMethod === 'cash' ? 'bkash' : initialMethod
  );
  const [bankName, setBankName] = useState(DEMO_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState(booking.customerPhone || '01711000000');
  const [pinOrOtp, setPinOrOtp] = useState('');
  const [step, setStep] = useState<'FORM' | 'OTP' | 'SUCCESS'>('FORM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<PaymentTransaction | null>(null);

  if (!isOpen) return null;

  const cleanAmount = Math.round(amount * 100) / 100;
  const adminShare = Math.round(cleanAmount * 0.1 * 100) / 100;
  const techShare = Math.round((cleanAmount - adminShare) * 100) / 100;

  const availableOnlineMethods = (['bkash', 'nagad', 'rocket', 'card'] as PaymentMethodCode[]).filter(
    (m) => activeMethods[m] !== false
  );

  const getChannelLabel = (m: PaymentMethodCode) => {
    if (m === 'bkash') return isBangla ? 'বিকাশ (bKash)' : 'bKash';
    if (m === 'nagad') return isBangla ? 'নগদ (Nagad)' : 'Nagad';
    if (m === 'rocket') return isBangla ? 'রকেট (Rocket)' : 'Rocket';
    return isBangla ? 'অনলাইন ব্যাংক / কার্ড' : 'Online Bank / Card';
  };

  const getProviderDisplay = () => {
    if (method === 'card') return bankName;
    if (method === 'bkash') return 'bKash Online Checkout';
    if (method === 'nagad') return 'Nagad e-Payment';
    if (method === 'rocket') return 'DBBL Rocket Gateway';
    return 'Online Banking';
  };

  const handleContinueToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = accountNumber.trim();
    if (trimmed.length < 6) {
      setError(
        isBangla
          ? 'অনুগ্রহ করে বৈধ মোবাইল নম্বর বা ব্যাংক/কার্ড নম্বর লিখুন।'
          : 'Please enter a valid mobile or bank/card account number.'
      );
      return;
    }
    setStep('OTP');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pinOrOtp.trim().length < 4) {
      setError(
        isBangla
          ? 'ডেমো ভেরিফিকেশনের জন্য কমপক্ষে ৪ সংখ্যার পিন/ওটিপি দিন (যেমন: 1234)।'
          : 'Enter at least a 4-digit demo PIN/OTP (e.g. 1234).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const tx = await submitDemoOnlinePaymentToFirestore({
        booking,
        method,
        amount: cleanAmount,
        bankOrProviderName: getProviderDisplay(),
        senderAccount: accountNumber.trim(),
        customerId: customerId || booking.customerId,
        customerName: customerName || booking.customerName,
      });

      // Best-effort sync with Express / local fallback
      if (getStoredAuthToken()) {
        void initiatePayment(booking.id, method, tx.idempotencyKey).catch(() => {});
      }

      setCompletedTx(tx);
      setStep('SUCCESS');
      onSubmitted?.(tx);
    } catch (err: any) {
      setError(
        err?.message ||
          (isBangla ? 'অনলাইন পেমেন্ট জমা দিতে ব্যর্থ হয়েছে।' : 'Failed to process demo online payment.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('FORM');
    setPinOrOtp('');
    setError(null);
    setCompletedTx(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10050] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Gateway Bar */}
        <div className="px-5 py-4 bg-zinc-900 dark:bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold tracking-tight truncate">
                {isBangla ? 'Servexa ডেমো অনলাইন ব্যাংকিং গেটওয়ে' : 'Servexa Demo Online Banking Gateway'}
              </div>
              <div className="text-[10px] text-zinc-400 font-mono truncate">
                #{booking.bookingNumber} · SSL Sandbox Escrow
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Summary Strip */}
        <div className="px-5 py-3 bg-stone-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] uppercase font-semibold text-zinc-500">
              {isBangla ? 'প্রদেয় মোট বিল' : 'Total Payable Amount'}
            </div>
            <div className="text-lg font-black text-zinc-900 dark:text-white tabular-nums">
              ৳{cleanAmount.toLocaleString()}
            </div>
          </div>
          <div className="text-right text-[10px] text-zinc-500 space-y-0.5 tabular-nums">
            <div>
              {isBangla ? 'টেকনিশিয়ান (৯০%):' : 'Technician (90%):'}{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{techShare}</span>
            </div>
            <div>
              {isBangla ? 'প্ল্যাটফর্ম ফি (১০%):' : 'Platform Fee (10%):'}{' '}
              <span className="font-bold text-zinc-700 dark:text-zinc-300">৳{adminShare}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold text-[11px]">
              {error}
            </div>
          )}

          {step === 'FORM' && (
            <form onSubmit={handleContinueToOtp} className="space-y-4">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  {isBangla ? 'অনলাইন পেমেন্ট মাধ্যম নির্বাচন করুন:' : 'Select Payment Method:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableOnlineMethods.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`p-2.5 rounded-xl border text-left font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                        method === m
                          ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                      }`}
                    >
                      {m === 'card' ? (
                        <CreditCard className="w-4 h-4 shrink-0" />
                      ) : (
                        <Smartphone className="w-4 h-4 shrink-0" />
                      )}
                      <span className="truncate">{getChannelLabel(m)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {method === 'card' && (
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    {isBangla ? 'ব্যাংক / কার্ড গেটওয়ে নির্বাচন করুন:' : 'Select Bank / Card Network:'}
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-white"
                  >
                    {DEMO_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Auto-filled Admin Platform Merchant / Escrow Account */}
              <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 space-y-1">
                <div className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase">
                  {isBangla ? 'Servexa প্ল্যাটফর্ম অ্যাডমিন মার্চেন্ট অ্যাকাউন্ট (অটো-ফিল):' : 'Servexa Admin Platform Account (Auto-filled):'}
                </div>
                <div className="font-mono font-black text-zinc-900 dark:text-white text-xs">
                  {method === 'bkash' && 'bKash Merchant: 01711223344'}
                  {method === 'nagad' && 'Nagad Merchant: 01811223344'}
                  {method === 'rocket' && 'Rocket Merchant: 01911223344'}
                  {method === 'card' && 'BRAC Bank Escrow: 1501202938492001 (Gulshan Branch)'}
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  {method === 'card'
                    ? isBangla
                      ? 'আপনার ব্যাংক অ্যাকাউন্ট / কার্ড নম্বর'
                      : 'Your Bank Account / Card Number'
                    : isBangla
                      ? `আপনার ${method.toUpperCase()} অ্যাকাউন্ট নম্বর`
                      : `Your ${method.toUpperCase()} Account Number`}
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={method === 'card' ? '4111 **** **** 1111' : '017XXXXXXXX'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 font-mono font-bold text-zinc-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2 text-[11px] text-blue-800 dark:text-blue-200">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  {isBangla
                    ? 'পেমেন্টের অর্থ প্রথমে Servexa অ্যাডমিন এসক্রো অ্যাকাউন্টে জমা হবে। অ্যাডমিন একসেপ্ট করার সাথে সাথে ৯০% টেকনিশিয়ানের ওয়ালেটে এবং ১০% প্ল্যাটফর্মে যোগ হবে।'
                    : 'Funds enter Servexa Admin Escrow first. Once Admin accepts, 90% credits immediately to the Technician wallet and 10% to Servexa.'}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isBangla ? 'পরবর্তী ধাপ (OTP যাচাই)' : 'Continue to Verification'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 space-y-1">
                <div className="text-[11px] text-zinc-500">{isBangla ? 'নির্বাচিত মাধ্যম' : 'Selected Channel'}</div>
                <div className="font-bold text-zinc-900 dark:text-white">{getProviderDisplay()}</div>
                <div className="font-mono text-[11px] text-zinc-500">{accountNumber}</div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  {isBangla ? 'ডেমো পিন / ওটিপি লিখুন (যেমন: 1234)' : 'Enter Demo PIN / OTP (e.g. 1234)'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    maxLength={8}
                    value={pinOrOtp}
                    onChange={(e) => setPinOrOtp(e.target.value)}
                    placeholder="••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 font-mono tracking-widest font-bold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  {isBangla ? 'পেছনে' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isBangla ? 'প্রসেসিং...' : 'Processing...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isBangla ? `৳${cleanAmount} পেমেন্ট নিশ্চিত করুন` : `Confirm ৳${cleanAmount} Payment`}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'SUCCESS' && completedTx && (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                {isBangla ? 'পেমেন্ট অ্যাডমিন এসক্রোতে জমা হয়েছে!' : 'Payment Submitted to Admin Escrow!'}
              </h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {isBangla
                  ? `ট্রানজেকশন নং ${completedTx.providerTxId}। অ্যাডমিন পেমেন্টটি একসেপ্ট করলে ৯০% (৳${completedTx.technicianAmount}) টেকনিশিয়ানের ওয়ালেটে ও ১০% (৳${completedTx.commissionAmount}) প্ল্যাটফর্মে যুক্ত হবে।`
                  : `TxID ${completedTx.providerTxId}. Once Admin accepts, 90% (৳${completedTx.technicianAmount}) credits to Technician and 10% (৳${completedTx.commissionAmount}) to Servexa.`}
              </p>
              <button
                type="button"
                onClick={resetAndClose}
                className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-orange-600 text-white font-bold cursor-pointer"
              >
                {isBangla ? 'ঠিক আছে' : 'Done'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
