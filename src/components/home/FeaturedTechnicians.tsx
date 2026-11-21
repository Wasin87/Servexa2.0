import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ArrowRight, User, Wrench, Lock, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { toBengaliNumber } from '../../utils/geoUtils';

export const FeaturedTechnicians: React.FC = () => {
  const { technicians, categories } = useApp();
  const { isBangla } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const featured = [...technicians]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  const getCategoryName = (skillId: string) => {
    const cat = categories.find((c) => c.id === skillId);
    if (!cat) return skillId || (isBangla ? 'টেকনিশিয়ান' : 'Technician');
    return isBangla ? cat.nameBn : cat.nameEn;
  };

  return (
    <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
        <div>
          <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
            {isBangla ? 'প্রফেশনালস নেটওয়ার্ক' : 'Professionals Network'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            {isBangla ? 'দক্ষ প্রফেশনালস ও টেকনিশিয়ান' : 'Skilled Professionals & Technicians'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            {isBangla
              ? 'কাজের ধরন, অভিজ্ঞতা ও রেটিং অনুযায়ী আপনার পছন্দের প্রফেশনাল বেছে নিন।'
              : 'Choose trusted technicians based on trade, experience, and customer rating.'}
          </p>
        </div>

        <Link
          to="/professionals"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
        >
          <span>{isBangla ? 'সকল প্রফেশনালস দেখুন' : 'View all professionals'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {featured.length === 0 ? (
        <div className="p-8 sm:p-10 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-center space-y-3">
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {isBangla
              ? 'এখনও কোনো টেকনিশিয়ান নিবন্ধিত হননি।'
              : 'No technicians are registered yet.'}
          </p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {isBangla
              ? 'টেকনিশিয়ানরা ওয়েবসাইটে রেজিস্ট্রেশন করলে এখানে লাইভ দেখা যাবে।'
              : 'Registered technicians will appear here live.'}
          </p>
          <Link
            to="/become-professional"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
          >
            <span>{isBangla ? 'টেকনিশিয়ান হিসেবে যোগ দিন' : 'Join as a Technician'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {featured.map((tech) => {
            const workLabel =
              tech.skills && tech.skills.length > 0
                ? tech.skills.map(getCategoryName).join(', ')
                : isBangla
                ? 'সাধারণ টেকনিশিয়ান'
                : 'General Technician';

            return (
              <div
                key={tech.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0">
                    {tech.avatar?.trim() ? (
                      <img
                        src={tech.avatar.trim()}
                        alt={tech.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-orange-500/25 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 flex items-center justify-center shadow-sm">
                        <User className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {tech.name}
                    </h3>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                      <Wrench className="w-3 h-3 shrink-0" />
                      <span className="truncate">{workLabel}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs pt-0.5">
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{toBengaliNumber(Number(tech.rating || 0).toFixed(1))}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-medium">
                        <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span>
                          {toBengaliNumber(tech.experienceYears || 0)}{' '}
                          {isBangla ? 'বছর' : 'yrs'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!isAuthenticated}
                    aria-disabled={!isAuthenticated}
                    onClick={
                      isAuthenticated ? () => navigate(`/book?techId=${tech.id}`) : undefined
                    }
                    className={`py-2 px-2.5 text-center text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-1 ${
                      isAuthenticated
                        ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-xs cursor-pointer'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed pointer-events-none select-none opacity-75'
                    }`}
                  >
                    {!isAuthenticated && <Lock className="w-3 h-3 shrink-0" />}
                    <span>{isBangla ? 'বুক নাও' : 'Book Now'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isAuthenticated}
                    aria-disabled={!isAuthenticated}
                    onClick={
                      isAuthenticated
                        ? () => navigate(`/professionals/${tech.id}`)
                        : undefined
                    }
                    className={`py-2 px-2.5 text-center text-xs font-semibold rounded-xl border transition-colors inline-flex items-center justify-center gap-1 ${
                      isAuthenticated
                        ? 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 cursor-pointer'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed pointer-events-none select-none opacity-75'
                    }`}
                  >
                    {!isAuthenticated ? (
                      <Lock className="w-3 h-3 shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{isBangla ? 'প্রোফাইল' : 'Profile'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
