import React from 'react';
import { X, Star, ShieldCheck, Award, Zap, ArrowRight, Check } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Technician } from '../../types';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({ isOpen, onClose }) => {
  const { technicians, comparedTechIds, removeFromCompare, clearCompare } = useApp();
  const { isBangla } = useLanguage();

  if (!isOpen) return null;

  const comparedList = technicians.filter(tech => comparedTechIds.includes(tech.id));

  // Compute Best Recommendation across compared technicians
  const computeBestOverall = (list: Technician[]) => {
    if (list.length === 0) return null;
    let best = list[0];
    let maxScore = -Infinity;

    for (const tech of list) {
      const ratingScore = (tech.rating || 4.5) * 7;
      const jobScore = Math.min(25, (tech.completedJobs || 0) / 10);
      const expScore = Math.min(20, (tech.experienceYears || 1) * 2);
      const priceVal = tech.startingPrice || 300;
      const priceScore = Math.max(0, 20 - (priceVal / 50));

      const totalScore = ratingScore + jobScore + expScore + priceScore;
      if (totalScore > maxScore) {
        maxScore = totalScore;
        best = tech;
      }
    }
    return best;
  };

  const bestTech = computeBestOverall(comparedList);

  const bestRating = comparedList.reduce((prev, curr) => (curr.rating > prev.rating ? curr : prev), comparedList[0]);
  const bestPrice = comparedList.reduce((prev, curr) => (curr.startingPrice < prev.startingPrice ? curr : prev), comparedList[0]);
  const bestExp = comparedList.reduce((prev, curr) => (curr.experienceYears > prev.experienceYears ? curr : prev), comparedList[0]);

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900">
          <div>
            <h3 className="font-black text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-600 shrink-0" />
              <span>{isBangla ? 'প্রফেশনাল তুলনা ও সেরা নির্বাচন কার্ড' : 'Professional Comparison & Best Match'}</span>
            </h3>
            <p className="text-[11px] text-zinc-500">
              {isBangla ? `নির্বাচিত প্রফেশনাল (${comparedList.length}/৫)` : `Selected Professionals (${comparedList.length}/5)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {comparedList.length > 0 && (
              <button
                onClick={clearCompare}
                type="button"
                className="text-xs font-bold text-zinc-500 hover:text-rose-600 transition-colors mr-2 cursor-pointer"
              >
                {isBangla ? 'সব মুছুন' : 'Clear All'}
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              aria-label="Close"
              className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {comparedList.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 space-y-2">
              <Award className="w-12 h-12 text-orange-400 mx-auto opacity-50" />
              <p className="text-sm font-bold">
                {isBangla ? 'তুলনা করার জন্য কোনো মিস্ত্রি নির্বাচিত করা হয়নি।' : 'No technicians selected for comparison.'}
              </p>
              <p className="text-xs text-zinc-400">
                {isBangla
                  ? 'প্রফেশনাল পেজে গিয়ে যেকোনো কার্ডের নিচের "তুলনা করো" বাটনে ক্লিক করে সর্বোচ্চ ৫ জন যোগ করুন।'
                  : 'Go to the Professionals page and click "Compare" on technician cards to add up to 5.'}
              </p>
            </div>
          ) : (
            <>
              {/* 3-Column Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {comparedList.map((tech) => {
                  const isOverallBest = bestTech?.id === tech.id;
                  return (
                    <div
                      key={tech.id}
                      className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isOverallBest
                          ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/25 shadow-md ring-2 ring-orange-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-900/60'
                      }`}
                    >
                      {isOverallBest && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-orange-600 text-white font-black text-[10px] rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <span>⭐ {isBangla ? 'সেরা পছন্দ (Best Match)' : 'Best Match'}</span>
                        </div>
                      )}

                      <button
                        onClick={() => removeFromCompare(tech.id)}
                        type="button"
                        aria-label="Remove"
                        className="absolute top-3 right-3 text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="সরিয়ে ফেলুন"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div>
                        {/* Avatar & Name */}
                        <div className="flex items-center gap-3 mb-4 pt-1">
                          {tech.avatar?.trim() ? (
                            <img
                              src={tech.avatar}
                              alt={tech.name}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-orange-500 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-600 text-white font-black text-base flex items-center justify-center border-2 border-orange-500 shadow-xs shrink-0">
                              {(tech.name || 'T').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {tech.name}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                              <span>
                                {tech.rating} ({tech.reviewCount})
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {tech.primaryArea}, {tech.city}
                            </div>
                          </div>
                        </div>

                        {/* Attribute Rows */}
                        <div className="space-y-2 text-xs border-t border-b border-zinc-200 dark:border-zinc-800 py-3 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">{isBangla ? 'অভিজ্ঞতা:' : 'Experience:'}</span>
                            <span
                              className={`font-bold ${
                                tech.id === bestExp?.id
                                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md'
                                  : 'text-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              {tech.experienceYears} {isBangla ? 'বছর' : 'Yrs'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">{isBangla ? 'সম্পন্ন কাজ:' : 'Completed Jobs:'}</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{tech.completedJobs}+</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">{isBangla ? 'শুরু মূল্য:' : 'Starting Price:'}</span>
                            <span
                              className={`font-black ${
                                tech.id === bestPrice?.id
                                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md'
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}
                            >
                              ৳{tech.startingPrice}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">{isBangla ? 'ভিজিটিং ফি:' : 'Visiting Fee:'}</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">৳{tech.visitingFee}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">{isBangla ? 'রেসপন্স রেট:' : 'Response Rate:'}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{tech.responseRate}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">{isBangla ? 'ওয়ারেন্টি:' : 'Warranty:'}</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {tech.warrantyPeriodDays} {isBangla ? 'দিন' : 'Days'}
                            </span>
                          </div>
                        </div>

                        {/* Verification Badges */}
                        <div className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 mb-4">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{isBangla ? 'জাতীয় পরিচয়পত্র ভেরিফায়েড' : 'NID Verified'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{isBangla ? 'দক্ষতা ও ট্রেনিং টেস্ট পাস' : 'Skill Test Passed'}</span>
                          </div>
                        </div>
                      </div>

                      <Link
                        to={`/book?techId=${tech.id}`}
                        onClick={onClose}
                        className={`w-full py-2.5 text-center text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 ${
                          isOverallBest
                            ? 'bg-orange-600 hover:bg-orange-500 text-white'
                            : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90'
                        }`}
                      >
                        <span>{isBangla ? 'বুক নাও' : 'Book Now'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Best Match Recommendation Result Banner */}
              {bestTech && (
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white shadow-xl space-y-3">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full w-fit backdrop-blur-md">
                    <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                    <span>{isBangla ? 'সর্বোত্তম তুলনা ফলাফল ও রিকমেন্ডেশন' : 'Best Match Recommendation Analysis'}</span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm sm:text-base font-black tracking-tight">
                        {isBangla ? `সেরা পছন্দ: ${bestTech.name}` : `Best Overall Choice: ${bestTech.name}`}
                      </h4>
                      <p className="text-xs text-orange-100 leading-relaxed max-w-xl">
                        {isBangla
                          ? `রেটিং (${bestTech.rating}★), অভিজ্ঞতা (${bestTech.experienceYears} বছর), সাশ্রয়ী শুরু মূল্য (৳${bestTech.startingPrice}) এবং সম্পন্ন কাজের (${bestTech.completedJobs}+) সামগ্রিক বিচারে ${bestTech.name} আপনার জন্য সবচেয়ে বিশ্বস্ত প্রফেশনাল।`
                          : `Based on rating (${bestTech.rating}★), experience (${bestTech.experienceYears} yrs), pricing (৳${bestTech.startingPrice}), and completed jobs (${bestTech.completedJobs}+), ${bestTech.name} offers the best overall value.`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/professionals/${bestTech.id}`}
                        onClick={onClose}
                        className="px-3.5 py-2 rounded-xl bg-white text-orange-600 font-extrabold text-xs hover:bg-orange-50 transition-colors shadow-md"
                      >
                        {isBangla ? 'প্রোফাইল' : 'Profile'}
                      </Link>
                      <Link
                        to={`/book?techId=${bestTech.id}`}
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-zinc-900 text-white font-extrabold text-xs hover:bg-zinc-800 transition-colors shadow-md"
                      >
                        {isBangla ? 'বুক করুন' : 'Book Pro'}
                      </Link>
                    </div>
                  </div>

                  {/* Category highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/20 text-[11px] font-semibold">
                    <div>
                      ⭐ {isBangla ? 'সর্বোচ্চ রেটিং:' : 'Highest Rating:'}{' '}
                      <strong className="text-amber-200">
                        {bestRating?.name} ({bestRating?.rating}★)
                      </strong>
                    </div>
                    <div>
                      💰 {isBangla ? 'সাশ্রয়ী মূল্য:' : 'Best Pricing:'}{' '}
                      <strong className="text-emerald-200">
                        {bestPrice?.name} (৳{bestPrice?.startingPrice})
                      </strong>
                    </div>
                    <div>
                      ⏱️ {isBangla ? 'সর্বোচ্চ অভিজ্ঞতা:' : 'Most Experienced:'}{' '}
                      <strong className="text-blue-200">
                        {bestExp?.name} ({bestExp?.experienceYears} yrs)
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer with Close Button */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-extrabold text-xs hover:opacity-90 transition-colors cursor-pointer shadow-sm"
          >
            {isBangla ? 'বন্ধ করুন (Close)' : 'Close Modal'}
          </button>
        </div>
      </div>
    </div>
  );
};
