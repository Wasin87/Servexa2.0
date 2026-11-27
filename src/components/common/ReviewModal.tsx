import React, { useState, useEffect } from 'react';
import { Star, X, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Booking, Review } from '../../types';

interface ReviewModalProps {
  booking: Booking;
  existingReview?: Review;
  isOpen: boolean;
  onClose: () => void;
}

const FEEDBACK_QUICK_TAGS = [
  { bn: 'সময়মতো এসেছেন', en: 'Arrived on time' },
  { bn: 'নিখুঁত কাজ', en: 'Quality workmanship' },
  { bn: 'ভদ্র ব্যবহার', en: 'Polite behavior' },
  { bn: 'ন্যায্য মূল্য', en: 'Fair pricing' },
  { bn: 'পরিচ্ছন্নতা বজায় রেখেছেন', en: 'Clean work area' }
];

export const ReviewModal: React.FC<ReviewModalProps> = ({ booking, existingReview, isOpen, onClose }) => {
  const { t, isBangla } = useLanguage();
  const { submitReview, updateReview } = useApp();
  const { currentUser } = useAuth();
  const { showToast, triggerConfettiBurst } = useToast();

  const [overallRating, setOverallRating] = useState<number>(existingReview?.overallRating ?? 5);
  const [workQuality, setWorkQuality] = useState<number>(existingReview?.workQuality ?? 5);
  const [behavior, setBehavior] = useState<number>(existingReview?.behavior ?? 5);
  const [punctuality, setPunctuality] = useState<number>(existingReview?.punctuality ?? 5);
  const [priceFairness, setPriceFairness] = useState<number>(existingReview?.priceFairness ?? 5);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    existingReview?.feedbackTags ?? ['সময়মতো এসেছেন', 'নিখুঁত কাজ']
  );
  const [comment, setComment] = useState<string>(existingReview?.comment ?? '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (existingReview) {
      setOverallRating(existingReview.overallRating || 5);
      setWorkQuality(existingReview.workQuality || 5);
      setBehavior(existingReview.behavior || 5);
      setPunctuality(existingReview.punctuality || 5);
      setPriceFairness(existingReview.priceFairness || 5);
      setSelectedTags(existingReview.feedbackTags || []);
      setComment(existingReview.comment || '');
    } else {
      setOverallRating(5);
      setWorkQuality(5);
      setBehavior(5);
      setPunctuality(5);
      setPriceFairness(5);
      setSelectedTags(['সময়মতো এসেছেন', 'নিখুঁত কাজ']);
      setComment('');
    }
  }, [isOpen, existingReview?.id]);

  if (!isOpen) return null;

  const isEditing = Boolean(existingReview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalComment =
      comment.trim() ||
      (isBangla
        ? 'চমৎকার ও বিশ্বস্ত সার্ভিস! সমস্যার দ্রুত ও স্থায়ী সমাধান পেয়েছি।'
        : 'Great and trustworthy service! The issue was fixed quickly and cleanly.');

    try {
      if (existingReview) {
        await updateReview(existingReview.id, {
          customerName: currentUser?.name || existingReview.customerName,
          customerAvatar: currentUser?.avatar || existingReview.customerAvatar,
          overallRating,
          workQuality,
          behavior,
          punctuality,
          priceFairness,
          feedbackTags: selectedTags,
          comment: finalComment,
        });
        triggerConfettiBurst();
        showToast(isBangla ? 'আপনার ফিডব্যাক ও রিভিউ সফলভাবে আপডেট হয়েছে!' : 'Your review has been updated successfully!');
      } else {
        submitReview({
          bookingId: booking.id,
          customerId: currentUser?.id || booking.customerId || '',
          customerName: currentUser?.name || booking.customerName || (isBangla ? 'গ্রাহক' : 'Customer'),
          customerAvatar: currentUser?.avatar || '',
          technicianId: booking.technicianId,
          overallRating,
          workQuality,
          behavior,
          punctuality,
          priceFairness,
          feedbackTags: selectedTags,
          comment: finalComment,
          serviceName: isBangla ? booking.serviceNameBn : booking.serviceNameEn
        });
        triggerConfettiBurst();
        showToast(isBangla ? 'আপনার মূল্যবান রিভিউ জমা হয়েছে!' : 'Your review has been submitted!');
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarSelector = (value: number, onChange: (val: number) => void) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 text-zinc-300 hover:text-amber-400 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
        >
          <Star
            className={`w-5 h-5 ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-zinc-300 dark:text-zinc-600'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100">
              {isEditing
                ? isBangla
                  ? 'ফিডব্যাক ও রিভিউ এডিট করুন'
                  : 'Edit Your Feedback & Review'
                : t.review.title}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {booking.technicianName} · {isBangla ? booking.serviceNameBn : booking.serviceNameEn}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
          {/* Main Rating */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
            <div>
              <span className="font-black text-xs text-zinc-900 dark:text-zinc-100 block">{t.review.overall}</span>
              <span className="text-[11px] text-orange-600 font-bold">
                {overallRating} / 5 {isBangla ? 'স্টার' : 'Stars'}
              </span>
            </div>
            {renderStarSelector(overallRating, setOverallRating)}
          </div>

          {/* Granular Sub-metrics */}
          <div className="space-y-2.5 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">{t.review.quality}</span>
              {renderStarSelector(workQuality, setWorkQuality)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">{t.review.behavior}</span>
              {renderStarSelector(behavior, setBehavior)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">{t.review.punctuality}</span>
              {renderStarSelector(punctuality, setPunctuality)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">{t.review.priceFairness}</span>
              {renderStarSelector(priceFairness, setPriceFairness)}
            </div>
          </div>

          {/* Quick Feedback Tags */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
              {isBangla ? 'দ্রুত ফিডব্যাক ট্যাগ নির্বাচন করুন:' : 'Quick Feedback Highlights:'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_QUICK_TAGS.map(item => {
                const tagLabel = isBangla ? item.bn : item.en;
                const active = selectedTags.includes(item.bn) || selectedTags.includes(item.en);
                return (
                  <button
                    key={item.en}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setSelectedTags(prev => prev.filter(t => t !== item.bn && t !== item.en));
                      } else {
                        setSelectedTags(prev => [...prev, tagLabel]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                      active
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-stone-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    <span>{tagLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text feedback */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t.review.commentPlaceholder}
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isBangla
                  ? 'মিস্ত্রি সময়মতো এসেছিলেন? কাজের অভিজ্ঞতা কেমন ছিল লিখুন...'
                  : 'Did the technician arrive on time? Share your experience...'
              }
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-black rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-md transition-colors cursor-pointer"
            >
              {isEditing
                ? isBangla
                  ? 'আপডেট সংরক্ষণ করুন'
                  : 'Save Updated Feedback'
                : t.review.submitReview}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
