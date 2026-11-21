import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Search,
  Wrench,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Lock,
  Clock,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { toBengaliNumber } from '../utils/geoUtils';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshLocations';

export const ProfessionalsPage: React.FC = () => {
  const { technicians, categories } = useApp();
  const { t, isBangla } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialCat = searchParams.get('category') || 'all';
  const initialArea = searchParams.get('area') || 'all';
  const initialDistrict = searchParams.get('district') || 'all';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrict);
  const [selectedArea, setSelectedArea] = useState<string>(initialArea);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'jobs' | 'experience'>('rating');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedDistrict, selectedArea, availabilityFilter, searchQuery, sortBy, isMobile]);

  const getCategoryName = (skillId: string) => {
    const cat = categories.find((c) => c.id === skillId);
    if (!cat) return skillId || (isBangla ? 'টেকনিশিয়ান' : 'Technician');
    return isBangla ? cat.nameBn : cat.nameEn;
  };

  const filteredTechnicians = useMemo(() => {
    return technicians
      .filter((tech) => {
        const matchesCategory =
          selectedCategory === 'all' || tech.skills.includes(selectedCategory);
        const matchesDistrict =
          selectedDistrict === 'all' ||
          (tech.district || tech.city || '').toLowerCase() === selectedDistrict.toLowerCase();
        const matchesArea =
          selectedArea === 'all' ||
          tech.primaryArea.toLowerCase() === selectedArea.toLowerCase() ||
          tech.serviceAreas.some((a) => a.toLowerCase() === selectedArea.toLowerCase());
        const matchesAvailability =
          availabilityFilter === 'all' ||
          (availabilityFilter === 'emergency'
            ? !!tech.emergencyAvailable
            : tech.availability === availabilityFilter);
        const matchesSearch =
          !searchQuery.trim() ||
          tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tech.skills.some((s) =>
            getCategoryName(s).toLowerCase().includes(searchQuery.toLowerCase())
          );

        return (
          matchesCategory &&
          matchesDistrict &&
          matchesArea &&
          matchesAvailability &&
          matchesSearch
        );
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'price') return a.startingPrice - b.startingPrice;
        if (sortBy === 'jobs') return b.completedJobs - a.completedJobs;
        if (sortBy === 'experience') return b.experienceYears - a.experienceYears;
        return 0;
      });
  }, [
    technicians,
    selectedCategory,
    selectedDistrict,
    selectedArea,
    availabilityFilter,
    searchQuery,
    sortBy,
    categories,
    isBangla,
  ]);

  const itemsPerPage = isMobile ? 24 : 48;
  const totalPages = Math.max(1, Math.ceil(filteredTechnicians.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTechnicians = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * itemsPerPage;
    return filteredTechnicians.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTechnicians, safeCurrentPage, itemsPerPage]);

  const startIndexNumber =
    filteredTechnicians.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endIndexNumber = Math.min(safeCurrentPage * itemsPerPage, filteredTechnicians.length);

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>{isBangla ? 'প্রফেশনালস তালিকা' : 'Professionals Directory'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            {isBangla ? 'সকল প্রফেশনালস ও টেকনিশিয়ান' : 'All Professionals & Technicians'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {isBangla
              ? 'নিবন্ধিত সকল টেকনিশিয়ানের কাজের ধরন, অভিজ্ঞতা ও রেটিং দেখুন'
              : 'Browse registered technicians by trade, years of experience, and rating.'}
          </p>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              {isBangla
                ? 'বুক নাও এবং প্রোফাইল বাটন সক্রিয় করতে আগে লগইন বা রেজিস্ট্রেশন করুন।'
                : 'Log in or register to enable the Book Now and Profile buttons.'}
            </span>
          </div>
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-500 transition-colors"
          >
            {isBangla ? 'লগইন করুন' : 'Sign In'}
          </Link>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-zinc-900 p-3 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs mb-6 sm:mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBangla ? 'নাম বা কাজের ধরন...' : 'Search name or trade...'}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium cursor-pointer"
            >
              <option value="all">{t.search.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {isBangla ? c.nameBn : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedArea('all');
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium cursor-pointer"
            >
              <option value="all">
                {isBangla ? 'সারা বাংলাদেশ (৬৪ জেলা)' : 'All Bangladesh (64 Districts)'}
              </option>
              {BANGLADESH_DISTRICTS.map((d) => (
                <option key={d.id} value={d.nameEn}>
                  {isBangla ? `${d.nameBn} (${d.nameEn})` : d.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium cursor-pointer"
            >
              <option value="all">{isBangla ? 'সকল প্রাপ্যতা' : 'All Availability'}</option>
              <option value="available">🟢 {isBangla ? 'এখনই এভেইলেবল' : t.tech.available}</option>
              <option value="busy">🟡 {isBangla ? 'কাজে ব্যস্ত' : t.tech.busy}</option>
              <option value="emergency">⚡ {isBangla ? 'জরুরি প্রস্তুত' : 'Emergency Ready'}</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'price' | 'jobs' | 'experience')}
              className="w-full px-2.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium cursor-pointer"
            >
              <option value="rating">★ {t.search.sortRating}</option>
              <option value="experience">⏱️ {t.search.sortExperience}</option>
            </select>
          </div>
        </div>
      </div>

      {filteredTechnicians.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm">
          <p>{t.search.noResults}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {paginatedTechnicians.map((tech) => {
            const workLabel =
              tech.skills && tech.skills.length > 0
                ? tech.skills.map(getCategoryName).join(', ')
                : isBangla
                ? 'সাধারণ টেকনিশিয়ান'
                : 'General Technician';

            return (
              <div
                key={tech.id}
                className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all duration-200"
              >
                {/* Profile Icon, Name, Work, Experience & Rating */}
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0">
                    {tech.avatar?.trim() ? (
                      <img
                        src={tech.avatar.trim()}
                        alt={tech.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-orange-500/25 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 flex items-center justify-center shadow-sm">
                        <User className="w-7 h-7 sm:w-8 sm:h-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                      {tech.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                      <Wrench className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{workLabel}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        <span>{toBengaliNumber(Number(tech.rating || 0).toFixed(1))}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>
                          {toBengaliNumber(tech.experienceYears || 0)}{' '}
                          {isBangla ? 'বছর অভিজ্ঞতা' : 'yrs exp'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Book Now & Profile Buttons — Strictly Disabled Until Logged In */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={!isAuthenticated}
                    aria-disabled={!isAuthenticated}
                    onClick={
                      isAuthenticated ? () => navigate(`/book?techId=${tech.id}`) : undefined
                    }
                    className={`py-2.5 px-3 text-center text-xs font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 ${
                      isAuthenticated
                        ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-xs cursor-pointer active:scale-98'
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
                    className={`py-2.5 px-3 text-center text-xs font-semibold rounded-xl border transition-colors inline-flex items-center justify-center gap-1.5 ${
                      isAuthenticated
                        ? 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed pointer-events-none select-none opacity-75'
                    }`}
                  >
                    {!isAuthenticated ? (
                      <Lock className="w-3 h-3 shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                    <span>{isBangla ? 'প্রোফাইল' : 'Profile'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredTechnicians.length > itemsPerPage && (
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {isBangla
              ? `মোট ${toBengaliNumber(filteredTechnicians.length)} জন মিস্ত্রির মধ্যে ${toBengaliNumber(startIndexNumber)}-${toBengaliNumber(endIndexNumber)} প্রদর্শিত হচ্ছে`
              : `Showing ${startIndexNumber}-${endIndexNumber} of ${filteredTechnicians.length} professionals`}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBangla ? 'আগের পৃষ্ঠা' : 'Prev'}</span>
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
              const isActive = pageNum === safeCurrentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                      : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {toBengaliNumber(pageNum)}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <span className="hidden sm:inline">{isBangla ? 'পরের পৃষ্ঠা' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
