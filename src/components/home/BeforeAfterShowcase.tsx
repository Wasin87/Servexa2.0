import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApp } from '../../contexts/AppContext';
import { BeforeAfterSlider } from '../common/BeforeAfterSlider';

export const BeforeAfterShowcase: React.FC = () => {
  const { t, isBangla } = useLanguage();
  const { technicians } = useApp();
  const [activeTab, setActiveTab] = useState(0);

  const liveProjects = technicians.flatMap((tech) =>
    (tech.portfolio || []).map((item) => ({
      id: item.id,
      titleEn: item.titleEn || 'Completed Project',
      titleBn: item.titleBn || item.titleEn || 'সম্পন্ন কাজ',
      categoryEn: item.category || 'Home Service',
      categoryBn: item.category || 'হোম সার্ভিস',
      techName: tech.name,
      location: `${tech.primaryArea || tech.city || 'Bangladesh'}`,
      before: item.beforeImage,
      after: item.afterImage,
      descriptionEn: item.descriptionEn || '',
      descriptionBn: item.descriptionBn || item.descriptionEn || '',
    }))
  );

  if (liveProjects.length === 0) {
    return null;
  }

  const safeIdx = Math.min(activeTab, liveProjects.length - 1);
  const current = liveProjects[safeIdx];

  return (
    <section className="py-16 sm:py-20 bg-stone-100/60 dark:bg-zinc-900/40 border-y border-zinc-200/80 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-2 mb-10">
          <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            {isBangla ? 'বাস্তব কাজের ফলাফল' : 'Proven Craftsmanship'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            {t.portfolio.title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            {t.portfolio.subtitle}
          </p>
        </div>

        {liveProjects.length > 1 && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs flex-wrap gap-1">
              {liveProjects.slice(0, 4).map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    safeIdx === idx
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {isBangla ? p.categoryBn : p.categoryEn}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <BeforeAfterSlider
                beforeImage={current.before}
                afterImage={current.after}
                aspectRatio="aspect-16/11"
              />
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="inline-block text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                {isBangla ? current.categoryBn : current.categoryEn}
              </div>

              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {isBangla ? current.titleBn : current.titleEn}
              </h3>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {isBangla ? current.descriptionBn : current.descriptionEn}
              </p>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">{isBangla ? 'কাজের স্থান:' : 'Location:'}</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {current.location}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">{isBangla ? 'দক্ষ মিস্ত্রি:' : 'Technician:'}</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {current.techName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
