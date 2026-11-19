import React from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApp } from '../../contexts/AppContext';

export const CustomerReviews: React.FC = () => {
  const { reviews } = useApp();
  const { isBangla } = useLanguage();

  const liveReviews = reviews.slice(0, 3).map((r) => ({
    id: r.id,
    name: r.customerName,
    area: isBangla ? 'ভেরিফায়েড বুকিং' : 'Verified Booking',
    rating: r.overallRating,
    service: r.serviceName,
    text: r.comment,
    date: r.createdAt,
  }));

  if (liveReviews.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center space-y-2 mb-12">
        <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
          {isBangla ? 'গ্রাহক প্রতিক্রিয়া' : 'Customer Stories'}
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          {isBangla ? 'হাজারো সন্তুষ্ট পরিবারের বিশ্বস্ত পছন্দ' : 'Trusted by Customers Across Bangladesh'}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {isBangla ? 'বাস্তব গ্রাহকদের অভিজ্ঞতা ও রেটিং' : 'Real reviews from verified completed bookings'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {liveReviews.map((t) => (
          <div
            key={t.id}
            className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(t.rating || 5)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-zinc-400">{t.date}</span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed italic mb-6">
                "{t.text}"
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{t.name}</h4>
                <p className="text-[11px] text-zinc-400">{t.area}</p>
              </div>
              <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
                {t.service}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
