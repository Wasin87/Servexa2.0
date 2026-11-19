import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Radio,
  CheckCircle2,
  ChevronRight,
  Activity,
  LocateFixed,
  Search,
  Loader2,
} from 'lucide-react';
import {
  DHAKA_HEATMAP_ZONES,
  HeatmapZone,
  LiveActivityItem,
  TechnicianLocation,
} from '../../data/heatmapData';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { RealLeafletMap } from './RealLeafletMap';
import { geocodeBangladeshLocation } from '../../utils/geoSearch';

type HeatmapMode = 'DEMAND_INTENSITY' | 'PRO_DENSITY' | 'EMERGENCY_HOTSPOTS';

interface HeatmapWidgetProps {
  compact?: boolean;
  className?: string;
  selectedZoneProp?: HeatmapZone;
  onSelectZone?: (zone: HeatmapZone) => void;
  searchedLocationProp?: { lat: number; lng: number; name: string; zoom?: number } | null;
  flyToSearchSeqProp?: number;
}

function getZoneMatchTokens(zone: HeatmapZone): string[] {
  const slug = zone.id.replace('zone-', '').toLowerCase();
  const extra: Record<string, string[]> = {
    mirpur: ['mirpur', 'মিরপুর'],
    uttara: ['uttara', 'উত্তরা'],
    dhanmondi: ['dhanmondi', 'kalabagan', 'ধানমন্ডি', 'কলাবাগান'],
    gulshan: ['gulshan', 'niketan', 'গুলশান', 'নিকেতন'],
    banani: ['banani', 'dohs', 'বনানী'],
    mohammadpur: ['mohammadpur', 'adabor', 'মোহাম্মদপুর', 'আদাবর'],
    bashundhara: ['bashundhara', 'baridhara', 'বসুন্ধরা', 'বারিধারা'],
    badda: ['badda', 'aftabnagar', 'বাড্ডা', 'আফতাবনগর'],
    motijheel: ['motijheel', 'paltan', 'মতিঝিল', 'পল্টন'],
    farmgate: ['farmgate', 'tejgaon', 'ফার্মগেট', 'তেজগাঁও'],
  };
  return extra[slug] || [slug];
}

function approxKmDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const HeatmapWidget: React.FC<HeatmapWidgetProps> = ({
  className = '',
  selectedZoneProp,
  onSelectZone,
  searchedLocationProp = null,
  flyToSearchSeqProp = 0,
}) => {
  const { isBangla } = useLanguage();
  const { technicians, bookings, categories } = useApp();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    selectedZoneProp?.id || DHAKA_HEATMAP_ZONES[0].id
  );
  const [activeMode, setActiveMode] = useState<HeatmapMode>('DEMAND_INTENSITY');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [flyToUserSeq, setFlyToUserSeq] = useState(0);
  const [widgetSearchQuery, setWidgetSearchQuery] = useState('');
  const [isSearchingWidgetLoc, setIsSearchingWidgetLoc] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number; name: string; zoom?: number } | null>(
    searchedLocationProp
  );
  const [flyToSearchSeq, setFlyToSearchSeq] = useState(0);

  // Derive live zones strictly from Firestore technicians + bookings (zero mock stats)
  const dynamicZones: HeatmapZone[] = useMemo(() => {
    return DHAKA_HEATMAP_ZONES.map((zone) => {
      const tokens = getZoneMatchTokens(zone);

      const matchedTechs = technicians.filter((tech) => {
        const text = [
          tech.primaryArea,
          tech.district,
          tech.city,
          ...(tech.serviceAreas || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const textMatch = tokens.some((tok) => text.includes(tok));
        const coordMatch =
          typeof tech.latitude === 'number' &&
          typeof tech.longitude === 'number' &&
          approxKmDistance(zone.lat, zone.lng, tech.latitude, tech.longitude) <= 3.5;
        return textMatch || coordMatch;
      });

      const onlineTechs = matchedTechs.filter((t) => t.availability === 'available');
      const matchedBookings = bookings.filter((b) => {
        const text = [b.customerArea, b.customerAddress, b.customerDistrict, b.customerCity]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const textMatch = tokens.some((tok) => text.includes(tok));
        const coordMatch =
          typeof b.customerLat === 'number' &&
          typeof b.customerLng === 'number' &&
          approxKmDistance(zone.lat, zone.lng, b.customerLat, b.customerLng) <= 3.5;
        return textMatch || coordMatch;
      });

      const activeZoneBookings = matchedBookings.filter(
        (b) => !['COMPLETED', 'CANCELLED'].includes(b.status)
      );
      const emergencyBookings = matchedBookings.filter((b) => b.urgency === 'emergency');

      // Calculate most demanded category from live bookings
      const catCounts: Record<string, number> = {};
      matchedBookings.forEach((b) => {
        if (b.categoryId) catCounts[b.categoryId] = (catCounts[b.categoryId] || 0) + 1;
      });
      const topCatId =
        Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || zone.topCategory;
      const topCatObj = categories.find((c) => c.id === topCatId);

      const demandScore = Math.min(
        100,
        activeZoneBookings.length * 20 + emergencyBookings.length * 15
      );
      const status: HeatmapZone['status'] =
        demandScore >= 70 ? 'HIGH_SURGE' : demandScore >= 35 ? 'MODERATE' : 'NORMAL';
      const surgeMultiplier = demandScore >= 70 ? 1.25 : demandScore >= 35 ? 1.1 : 1.0;

      const nearbyTechs: TechnicianLocation[] = matchedTechs.map((t, idx) => {
        const primarySkill = t.skills[0];
        const skillCat = categories.find((c) => c.id === primarySkill);
        const offsetAngle = (idx * 65 * Math.PI) / 180;
        const lat =
          typeof t.latitude === 'number' && t.latitude !== 0
            ? t.latitude
            : zone.lat + Math.sin(offsetAngle) * 0.004;
        const lng =
          typeof t.longitude === 'number' && t.longitude !== 0
            ? t.longitude
            : zone.lng + Math.cos(offsetAngle) * 0.004;
        return {
          id: t.id,
          name: t.name,
          tradeBn: skillCat?.nameBn || t.bioBn || 'টেকনিশিয়ান',
          tradeEn: skillCat?.nameEn || t.bioEn || 'Technician',
          rating: t.rating || 0,
          lat,
          lng,
          available: t.availability === 'available',
          etaMins: 15,
          etaMinutes: 15,
          phone: t.phone || '',
        };
      });

      return {
        ...zone,
        demandScore,
        activeTechnicians: onlineTechs.length > 0 ? onlineTechs.length : matchedTechs.length,
        activeRequests: activeZoneBookings.length,
        avgArrivalMinutes: matchedTechs.length > 0 ? 15 : 0,
        emergencyCallsToday: emergencyBookings.length,
        status,
        surgeMultiplier,
        topCategory: topCatObj?.nameEn || zone.topCategory,
        topCategoryBn: topCatObj?.nameBn || zone.topCategoryBn,
        featuredPros: matchedTechs.slice(0, 2).map((t) => {
          const skillCat = categories.find((c) => c.id === t.skills[0]);
          return {
            id: t.id,
            name: t.name,
            tradeBn: skillCat?.nameBn || t.bioBn || 'সার্ভিস প্রফেশনাল',
            tradeEn: skillCat?.nameEn || t.bioEn || 'Service Professional',
            rating: t.rating || 0,
          };
        }),
        nearbyTechs,
      };
    });
  }, [technicians, bookings, categories]);

  useEffect(() => {
    if (selectedZoneProp && selectedZoneProp.id !== selectedZoneId) {
      setSelectedZoneId(selectedZoneProp.id);
    }
  }, [selectedZoneProp?.id]);

  useEffect(() => {
    if (flyToSearchSeqProp && searchedLocationProp) {
      setSearchedLocation(searchedLocationProp);
      setFlyToSearchSeq((s) => s + 1);
      setWidgetSearchQuery(searchedLocationProp.name);
    }
  }, [flyToSearchSeqProp, searchedLocationProp?.lat, searchedLocationProp?.lng, searchedLocationProp?.name]);

  const selectedZone =
    dynamicZones.find((z) => z.id === selectedZoneId) || dynamicZones[0];

  // Live activities strictly derived from real Firestore bookings
  const liveActivities: LiveActivityItem[] = useMemo(() => {
    return bookings.slice(0, 6).map((b) => {
      const matchedZone = dynamicZones.find((z) =>
        getZoneMatchTokens(z).some((tok) =>
          `${b.customerArea} ${b.customerAddress} ${b.customerDistrict}`
            .toLowerCase()
            .includes(tok)
        )
      );
      return {
        id: b.id,
        zoneId: matchedZone?.id || 'custom',
        zoneNameBn:
          matchedZone?.nameBn.split('(')[0].trim() || b.customerArea || b.customerDistrict || 'ঢাকা',
        zoneNameEn:
          matchedZone?.nameEn.split('(')[0].trim() || b.customerArea || b.customerDistrict || 'Dhaka',
        categoryBn: b.serviceNameBn,
        categoryEn: b.serviceNameEn,
        timestamp: b.date,
        type:
          b.urgency === 'emergency'
            ? 'EMERGENCY'
            : b.status === 'COMPLETED'
            ? 'COMPLETED'
            : 'DISPATCHED',
      };
    });
  }, [bookings, dynamicZones]);

  const handleZoneClick = (zone: HeatmapZone) => {
    setSelectedZoneId(zone.id);
    if (onSelectZone) onSelectZone(zone);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast(
        isBangla
          ? 'আপনার ব্রাউজার GPS লোকেশন সাপোর্ট করে না।'
          : 'Geolocation is not supported by your browser.',
        'error'
      );
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setFlyToUserSeq((s) => s + 1);
        setIsLocatingUser(false);

        // Select nearest zone if within Dhaka metro (~35km)
        let nearestZone = dynamicZones[0];
        let minDist = Infinity;
        dynamicZones.forEach((z) => {
          const d = approxKmDistance(lat, lng, z.lat, z.lng);
          if (d < minDist) {
            minDist = d;
            nearestZone = z;
          }
        });
        if (minDist <= 35 && nearestZone) {
          setSelectedZoneId(nearestZone.id);
          if (onSelectZone) onSelectZone(nearestZone);
        }

        showToast(
          isBangla
            ? '📍 ম্যাপে আপনার বর্তমান লাইভ অবস্থান দেখানো হচ্ছে!'
            : '📍 Centered map on your current live location!',
          'success'
        );
      },
      (err) => {
        setIsLocatingUser(false);
        showToast(
          err.code === err.PERMISSION_DENIED
            ? isBangla
              ? 'লোকেশন পারমিশন দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজারের লোকেশন অ্যাক্সেস চালু করুন।'
              : 'Location permission denied. Please enable location access in your browser.'
            : isBangla
            ? 'বর্তমান অবস্থান নির্ণয় করা যায়নি। পুনরায় চেষ্টা করুন।'
            : 'Could not determine your current location. Please try again.',
          'error'
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleWidgetLocationSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = widgetSearchQuery.trim();
    if (!q) {
      showToast(
        isBangla ? 'অনুগ্রহ করে যেকোনো এলাকার নাম লিখুন।' : 'Please enter an area or location name.',
        'info'
      );
      return;
    }

    setIsSearchingWidgetLoc(true);
    try {
      const geo = await geocodeBangladeshLocation(q, isBangla);
      if (!geo) {
        showToast(
          isBangla
            ? `"${q}" লোকেশনটি খুঁজে পাওয়া যায়নি। এলাকার নাম স্পষ্টভাবে লিখুন।`
            : `Could not locate "${q}". Try a clearer area or district name.`,
          'error'
        );
        return;
      }

      setSearchedLocation({ lat: geo.lat, lng: geo.lng, name: geo.name, zoom: geo.zoom });
      setFlyToSearchSeq((s) => s + 1);

      // Update selected zone if within 12km of a Dhaka zone
      let nearestZone = dynamicZones[0];
      let minDist = Infinity;
      dynamicZones.forEach((z) => {
        const d = approxKmDistance(geo.lat, geo.lng, z.lat, z.lng);
        if (d < minDist) {
          minDist = d;
          nearestZone = z;
        }
      });
      if (minDist <= 12 && nearestZone) {
        setSelectedZoneId(nearestZone.id);
        if (onSelectZone) onSelectZone(nearestZone);
      }

      showToast(
        isBangla
          ? `📍 ${geo.name} লোকেশনে ম্যাপ এবং পিন নিয়ে যাওয়া হয়েছে`
          : `📍 Moved map & location pin to ${geo.name}`,
        'success'
      );
    } finally {
      setIsSearchingWidgetLoc(false);
    }
  };

  const totalOnlinePros = technicians.filter((t) => t.availability !== 'offline').length;
  const totalActiveRequests = bookings.filter(
    (b) => !['COMPLETED', 'CANCELLED'].includes(b.status)
  ).length;
  const activeEtaZones = dynamicZones.filter((z) => z.avgArrivalMinutes > 0);
  const avgArrival =
    activeEtaZones.length > 0
      ? Math.round(
          activeEtaZones.reduce((acc, z) => acc + z.avgArrivalMinutes, 0) /
            activeEtaZones.length
        )
      : 0;

  const topHotspotZone = dynamicZones
    .slice()
    .sort((a, b) => b.demandScore - a.demandScore || b.activeTechnicians - a.activeTechnicians)[0];
  const hasHotspotActivity =
    topHotspotZone && (topHotspotZone.demandScore > 0 || topHotspotZone.activeTechnicians > 0);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-orange-200 dark:border-orange-500/25 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl transition-colors duration-250 ${className}`}
    >
      {/* Radiant Orange Ambient Backdrop */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-orange-500/10 dark:bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-amber-400/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 px-5 sm:px-8 py-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-stone-50/90 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
              {isBangla ? 'রিয়েল-টাইম লাইভ জিপিএস হিটম্যাপ' : 'Real-Time Live GPS Heatmap'}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              {isBangla ? 'ঢাকা মেট্রো ও পার্শ্ববর্তী এলাকা' : 'Dhaka Metro Hotspots'}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            {isBangla
              ? 'সার্ভিস ডিমান্ড ও টেকনিশিয়ান উপস্থিতি'
              : 'Service Demand & Technician Density'}
          </h3>
        </div>

        {/* Right Controls: My Location + Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocatingUser}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isLocatingUser ? 'animate-spin' : 'text-orange-400'}`} />
            <span>
              {isLocatingUser
                ? isBangla
                  ? 'খুঁজছে...'
                  : 'Locating...'
                : isBangla
                ? 'আমার অবস্থান'
                : 'My Location'}
            </span>
          </button>

          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs shadow-xs">
            <button
              onClick={() => setActiveMode('DEMAND_INTENSITY')}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeMode === 'DEMAND_INTENSITY'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{isBangla ? 'ডিমান্ড হটস্পট' : 'Demand Heat'}</span>
            </button>
            <button
              onClick={() => setActiveMode('PRO_DENSITY')}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeMode === 'PRO_DENSITY'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isBangla ? 'মিস্ত্রি ঘনত্ব' : 'Pro Density'}</span>
            </button>
            <button
              onClick={() => setActiveMode('EMERGENCY_HOTSPOTS')}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeMode === 'EMERGENCY_HOTSPOTS'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isBangla ? 'জরুরি কল' : 'Emergency'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Macro Stats Bar - Live Firestore Computed */}
      <div className="px-5 sm:px-8 py-3 bg-stone-50/50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium">
              {isBangla ? 'অনলাইন টেকনিশিয়ান' : 'Active Technicians'}
            </div>
            <div className="font-extrabold text-zinc-900 dark:text-white tabular-nums">
              {totalOnlinePros} {isBangla ? 'জন সক্রিয়' : 'Online'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium">
              {isBangla ? 'চলমান সার্ভিস কল' : 'Active Calls'}
            </div>
            <div className="font-extrabold text-zinc-900 dark:text-white tabular-nums">
              {totalActiveRequests} {isBangla ? 'টি কাজ চলমান' : 'In Progress'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium">
              {isBangla ? 'গড় আগমন সময়' : 'Avg Arrival ETA'}
            </div>
            <div className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {avgArrival > 0 ? `~${avgArrival} ${isBangla ? 'মিনিট' : 'mins'}` : isBangla ? '—' : '—'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-zinc-500 dark:text-zinc-400 text-[10px] font-medium">
              {isBangla ? 'শীর্ষ চাহিদার জোন' : 'Top Hotspot'}
            </div>
            <div className="font-extrabold text-orange-600 dark:text-orange-400 truncate">
              {hasHotspotActivity
                ? isBangla
                  ? topHotspotZone.nameBn.split('(')[0].trim()
                  : topHotspotZone.nameEn.split('(')[0].trim()
                : isBangla
                ? 'কোনো সক্রিয় জোন নেই'
                : 'No active zones yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Heatmap Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
        {/* Left Real Leaflet Map Viewport (8 Cols) */}
        <div className="lg:col-span-8 p-4 sm:p-6 flex flex-col justify-between overflow-hidden bg-stone-100/60 dark:bg-zinc-950/70 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 transition-colors gap-3">
          {/* Quick Location Search Bar for Heatmap */}
          <form onSubmit={handleWidgetLocationSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-orange-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={widgetSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setWidgetSearchQuery(val);
                  if (!val.trim()) setSearchedLocation(null);
                }}
                placeholder={
                  isBangla
                    ? 'যেকোনো এলাকা বা লোকেশন খুঁজুন (যেমন: যাত্রাবাড়ী, সাভার, চট্টগ্রাম...)'
                    : 'Search any area or location (e.g. Jatrabari, Savar, Chattogram...)'
                }
                className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
              {widgetSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setWidgetSearchQuery('');
                    setSearchedLocation(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearchingWidgetLoc}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer disabled:opacity-70"
            >
              {isSearchingWidgetLoc ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>{isSearchingWidgetLoc ? (isBangla ? 'খুঁজছে...' : 'Finding...') : isBangla ? 'সার্চ' : 'Search'}</span>
            </button>
          </form>

          <RealLeafletMap
            zones={dynamicZones}
            selectedZone={selectedZone}
            onSelectZone={handleZoneClick}
            activeMode={activeMode}
            userLocation={userLocation}
            flyToUserSeq={flyToUserSeq}
            searchedLocation={searchedLocation}
            flyToSearchSeq={flyToSearchSeq}
          />

          {/* Real-Time Live Activity Ticker Bar */}
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3 overflow-hidden text-xs">
            <div className="flex items-center gap-1.5 shrink-0 font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider text-[10px]">
              <Activity className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span>{isBangla ? 'লাইভ ডিসপ্যাচ ফিড:' : 'Live Feed:'}</span>
            </div>
            <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-3 whitespace-nowrap">
              {liveActivities.length === 0 ? (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {isBangla
                    ? 'এখনো কোনো লাইভ ডিসপ্যাচ কার্যক্রম শুরু হয়নি।'
                    : 'No live dispatch activities recorded yet.'}
                </span>
              ) : (
                liveActivities.slice(0, 4).map((act) => (
                  <div
                    key={act.id}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300 shadow-xs"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        act.type === 'EMERGENCY'
                          ? 'bg-rose-500'
                          : act.type === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : 'bg-orange-500'
                      }`}
                    />
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {isBangla ? act.zoneNameBn : act.zoneNameEn}
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {isBangla ? act.categoryBn : act.categoryEn}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Zone Deep-Dive Inspection Panel (4 Cols) */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-stone-50/80 dark:bg-zinc-900/90 flex flex-col justify-between transition-colors">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedZone.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Zone Title Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 text-xs font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{isBangla ? 'নির্বাচিত এলাকা' : 'Selected Zone'}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedZone.status === 'HIGH_SURGE'
                        ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {selectedZone.status === 'HIGH_SURGE'
                      ? isBangla
                        ? '🔥 উচ্চ চাপ (সার্জ)'
                        : '🔥 Surge Area'
                      : isBangla
                      ? 'স্বাভাবিক'
                      : 'Normal'}
                  </span>
                </div>
                <h4 className="text-xl font-black text-zinc-900 dark:text-white">
                  {isBangla ? selectedZone.nameBn : selectedZone.nameEn}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  {isBangla ? selectedZone.shortDescBn : selectedZone.shortDescEn}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5 font-medium">
                    {isBangla ? 'ডিমান্ড ইনডেক্স' : 'Demand Score'}
                  </div>
                  <div className="text-2xl font-black text-orange-600 dark:text-orange-500 tabular-nums">
                    {selectedZone.demandScore}
                    <span className="text-xs text-zinc-400 font-normal">/100</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedZone.demandScore}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5 font-medium">
                    {isBangla ? 'কাছের মিস্ত্রি' : 'Nearby Pros'}
                  </div>
                  <div className="text-2xl font-black text-zinc-900 dark:text-white tabular-nums">
                    {selectedZone.activeTechnicians}{' '}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                      {isBangla ? 'জন' : 'Pros'}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                    {selectedZone.avgArrivalMinutes > 0
                      ? `${isBangla ? 'গড় আগমন: ' : 'Avg ETA: '}${selectedZone.avgArrivalMinutes} ${isBangla ? 'মিনিট' : 'min'}`
                      : isBangla
                      ? 'মিস্ত্রি যুক্ত হলে দেখাবে'
                      : 'Updates when pros join'}
                  </div>
                </div>
              </div>

              {/* Top Service in Demand */}
              <div className="p-3.5 rounded-2xl bg-orange-500/10 dark:bg-orange-950/20 border border-orange-500/25">
                <div className="text-[10px] uppercase tracking-wider font-black text-orange-600 dark:text-orange-400 mb-1">
                  {isBangla ? 'বর্তমানে সর্বাধিক চাহিদাসম্পন্ন কাজ' : 'Top In-Demand Category'}
                </div>
                <div className="text-sm font-black text-zinc-900 dark:text-white flex items-center justify-between">
                  <span>{isBangla ? selectedZone.topCategoryBn : selectedZone.topCategory}</span>
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-bold tabular-nums">
                    {selectedZone.activeRequests} {isBangla ? 'কল রিকোয়েস্ট' : 'Active Calls'}
                  </span>
                </div>
              </div>

              {/* Zone Dispatch Readiness Indicator */}
              <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {isBangla ? 'লাইভ ডিসপ্যাচ প্রস্তুতি' : 'Live Dispatch Readiness'}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedZone.activeTechnicians} {isBangla ? 'জন মিস্ত্রি প্রস্তুত' : 'Pros Ready'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {selectedZone.activeTechnicians > 0
                    ? isBangla
                      ? 'এই এলাকায় কল দেওয়ার সাথে সাথে নিকটতম ভেরিফায়েড টেকনিশিয়ানকে অ্যাসাইন করা হবে।'
                      : 'Dispatch requests in this zone are automatically assigned to nearest verified pros.'
                    : isBangla
                    ? 'এই জোনে টেকনিশিয়ান নিবন্ধিত হলে এখান থেকে সরাসরি লাইভ বুকিং ও প্রোফাইল দেখা যাবে।'
                    : 'Verified technicians who register in this zone will appear here for instant booking.'}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action CTAs */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <button
              onClick={() =>
                navigate(
                  isAuthenticated
                    ? `/book?zone=${selectedZone.id}&service=${encodeURIComponent(selectedZone.topCategory)}`
                    : '/login'
                )
              }
              type="button"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <span>
                {isBangla
                  ? `${selectedZone.nameBn.split('(')[0].trim()} জোনে মিস্ত্রি ডাকুন`
                  : `Book Pro in ${selectedZone.nameEn.split('(')[0].trim()}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/professionals')}
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-bold text-xs border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{isBangla ? 'সকল প্রফেশনাল তালিকা দেখুন' : 'Explore All Technicians'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
