import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  Search,
  Navigation,
  Layers,
  Flame,
  Users,
  Filter,
  Star,
  RotateCcw,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  MapPin,
  Loader2
} from 'lucide-react';
import { Technician } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { DHAKA_HEATMAP_ZONES } from '../../data/heatmapData';
import {
  DHAKA_CENTER,
  calculateHaversineDistance,
  formatDistance,
  toBengaliNumber,
  detectServiceCategoryFromQuery,
  CATEGORY_VISUAL_MAP,
  calculateRecommendationScore,
  getRecommendationReasons,
  isValidLatLng,
  safeFlyOrSetView,
  safeLatLngToContainerPoint,
  attachMapResizeObserver
} from '../../utils/geoUtils';
import { createResilientTileLayer, MapTileStyle } from '../../utils/mapTiles';
import {
  GeoSearchResult,
  findExactLocalLocation,
  geocodeBangladeshLocation,
  getLocalLocationSuggestions,
  searchNominatimBangladesh
} from '../../utils/geoSearch';

export interface TechnicianMapProps {
  mode?: 'standalone' | 'embedded';
  initialCategory?: string;
  initialRadiusKm?: number;
  height?: string;
  onSelectTechnician?: (tech: Technician) => void;
  selectedTechId?: string;
  className?: string;
  showListToggle?: boolean;
}

type MapMode = 'PROS' | 'HEATMAP';
type TileLayerType = MapTileStyle;
type SortOption = 'recommended' | 'nearest' | 'rating' | 'experience' | 'price' | 'available_first';

export const DHAKA_LOCATIONS: { nameBn: string; nameEn: string; keywords: string[]; lat: number; lng: number; zoom: number }[] = [
  { nameBn: 'মিরপুর', nameEn: 'Mirpur', keywords: ['mirpur', 'মিরপুর', 'mirpur 10', 'mirpur 1', 'mirpur 2', 'mirpur 12', 'mirpur 11', 'dohs mirpur', 'pallabi', 'পল্লবী', 'shewrapara', 'শেওড়াপাড়া', 'kazipara', 'কাজীপাড়া', 'rokeya sarani'], lat: 23.8069, lng: 90.3687, zoom: 14 },
  { nameBn: 'উত্তরা', nameEn: 'Uttara', keywords: ['uttara', 'উত্তরা', 'uttora', 'sector 1', 'sector 3', 'sector 7', 'sector 10', 'sector 11', 'sector 12', 'sector 13', 'sector 14', 'diabari', 'দিয়াবাড়ি', 'airport', 'বিমানবন্দর', 'abdullahpur', 'আব্দুল্লাহপুর'], lat: 23.8759, lng: 90.3795, zoom: 14 },
  { nameBn: 'ধানমন্ডি', nameEn: 'Dhanmondi', keywords: ['dhanmondi', 'ধানমন্ডি', 'dhanmandi', 'kalabagan', 'কলাবাগান', 'shankhar', 'zigatola', 'জিগাতলা', 'panthapath', 'পান্থপথ', 'science lab', 'সাইন্স ল্যাব'], lat: 23.7461, lng: 90.3742, zoom: 14 },
  { nameBn: 'গুলশান', nameEn: 'Gulshan', keywords: ['gulshan', 'গুলশান', 'gulshan 1', 'gulshan 2', 'gulshan-1', 'gulshan-2', 'niketan', 'নিকেতন', 'police plaza'], lat: 23.7925, lng: 90.4078, zoom: 14 },
  { nameBn: 'বনানী', nameEn: 'Banani', keywords: ['banani', 'বনানী', 'banani dohs', 'chairman bari', 'kemal ataturk'], lat: 23.7937, lng: 90.4043, zoom: 14 },
  { nameBn: 'মোহাম্মদপুর', nameEn: 'Mohammadpur', keywords: ['mohammadpur', 'মোহাম্মদপুর', 'mohamadpur', 'adabor', 'আদাবর', 'salimullah', 'tajmahal road', 'tajmahal', 'bosila', 'বসিলা', 'ring road', 'town hall'], lat: 23.7658, lng: 90.3584, zoom: 14 },
  { nameBn: 'বাড্ডা', nameEn: 'Badda', keywords: ['badda', 'বাড্ডা', 'middle badda', 'north badda', 'south badda', 'merul badda', 'মেরুল বাড্ডা', 'aftabnagar', 'আফতাবনগর'], lat: 23.7805, lng: 90.4267, zoom: 14 },
  { nameBn: 'ফার্মগেট', nameEn: 'Farmgate', keywords: ['farmgate', 'ফার্মগেট', 'framgate', 'monipuripara', 'green road', 'গ্রিন রোড', 'kawran bazar', 'karwan bazar', 'কারওয়ান বাজার'], lat: 23.7570, lng: 90.3888, zoom: 14 },
  { nameBn: 'মহাখালী', nameEn: 'Mohakhali', keywords: ['mohakhali', 'মহাখালী', 'mohakhali dohs', 'wireless', 'ওয়ারলেস', 'amtoli'], lat: 23.7776, lng: 90.4054, zoom: 14 },
  { nameBn: 'মতিঝিল', nameEn: 'Motijheel', keywords: ['motijheel', 'মতিঝিল', 'dilkusha', 'দিলকুশা', 'paltan', 'পল্টন', 'kakrail', 'কাকরাইল', 'arambagh'], lat: 23.7330, lng: 90.4172, zoom: 14 },
  { nameBn: 'পুরান ঢাকা', nameEn: 'Old Dhaka', keywords: ['old dhaka', 'পুরান ঢাকা', 'lalbagh', 'লালবাগ', 'sadarghat', 'সদরঘাট', 'chawkbazar', 'চকবাজার', 'wari', 'ওয়ারী', 'sutrapur', 'সূত্রাপুর', 'armanitola'], lat: 23.7150, lng: 90.4020, zoom: 14 },
  { nameBn: 'বসুন্ধরা', nameEn: 'Bashundhara R/A', keywords: ['bashundhara', 'বসুন্ধরা', 'bashundhara r/a', 'bashundhara residential', 'kuratoli', 'baridhara', 'বারিধারা'], lat: 23.8151, lng: 90.4255, zoom: 14 },
  { nameBn: 'তেজগাঁও', nameEn: 'Tejgaon', keywords: ['tejgaon', 'তেজগাঁও', 'nabiket', 'industrial area', 'ইন্ডাস্ট্রিয়াল এরিয়া'], lat: 23.7639, lng: 90.3980, zoom: 14 },
  { nameBn: 'মালিবাগ ও খিলগাঁও', nameEn: 'Malibagh & Khilgaon', keywords: ['malibagh', 'মালিবাগ', 'khilgaon', 'খিলগাঁও', 'shantinagar', 'শান্তিনগর', 'mouchak', 'মৌচাক', 'goran', 'গোড়ান'], lat: 23.7480, lng: 90.4180, zoom: 14 },
  { nameBn: 'রামপুরা ও বনশ্রী', nameEn: 'Rampura & Banasree', keywords: ['rampura', 'রামপুরা', 'banasree', 'বনশ্রী', 'hatirjheel', 'হাতিরঝিল', 'aftab nagar'], lat: 23.7610, lng: 90.4280, zoom: 14 },
  { nameBn: 'কুড়িল ও খিলক্ষেত', nameEn: 'Kuril & Khilkhet', keywords: ['kuril', 'কুড়িল', 'khilkhet', 'খিলক্ষেত', 'nikunja', 'নিকুঞ্জ', 'le meridien'], lat: 23.8240, lng: 90.4220, zoom: 14 }
];

export const TechnicianMap: React.FC<TechnicianMapProps> = ({
  initialCategory = 'all',
  initialRadiusKm = 10,
  height = 'calc(100vh - 120px)',
  onSelectTechnician,
  selectedTechId: externalSelectedTechId,
  className = ''
}) => {
  const { technicians, categories } = useApp();
  const { isBangla } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedCameraRef = useRef(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchRequestSeqRef = useRef(0);

  // State
  const [mapMode, setMapMode] = useState<MapMode>('PROS');
  const [tileType, setTileType] = useState<TileLayerType>('THEMED');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'busy' | 'emergency'>('all');
  const [distanceRadiusKm, setDistanceRadiusKm] = useState<number>(initialRadiusKm);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  // User Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationToast, setLocationToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Selected Technician & Popup
  const [selectedTechId, setSelectedTechId] = useState<string | null>(externalSelectedTechId || null);
  const [activePopupTechId, setActivePopupTechId] = useState<string | null>(null);
  const [hoveredTechId, setHoveredTechId] = useState<string | null>(null);
  const [hoveredClusterIndex, setHoveredClusterIndex] = useState<number | null>(null);
  const [cardPoint, setCardPoint] = useState<{ x: number; y: number } | null>(null);

  // Dynamic Camera Center & Zoom state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: DHAKA_CENTER.lat,
    lng: DHAKA_CENTER.lng
  });
  const [zoomLevel, setZoomLevel] = useState<number>(12);
  const [flySeq, setFlySeq] = useState<number>(0);
  const [searchedLocationPin, setSearchedLocationPin] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locationSearchActive, setLocationSearchActive] = useState<boolean>(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<GeoSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [, setDetectedCategory] = useState<string | null>(null);

  // Sync external selection if prop changes
  useEffect(() => {
    if (externalSelectedTechId && externalSelectedTechId !== selectedTechId) {
      setSelectedTechId(externalSelectedTechId);
      setActivePopupTechId(externalSelectedTechId);
      const matched = technicians.find((t) => t.id === externalSelectedTechId);
      if (matched && matched.latitude && matched.longitude) {
        setMapCenter({ lat: matched.latitude, lng: matched.longitude });
        setZoomLevel(15);
      }
    }
  }, [externalSelectedTechId]);

  useEffect(() => {
    handleRequestLocation(false);
  }, []);

  const handleRequestLocation = (showErrorToast = true) => {
    if (!navigator.geolocation) {
      if (showErrorToast) {
        setLocationToast({
          message: isBangla
            ? 'আপনার ব্রাউজারে লোকেশন সার্ভিস সমর্থিত নয়।'
            : 'Geolocation is not supported by your browser.',
          type: 'error'
        });
      }
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
          setUserLocation({ lat: latitude, lng: longitude, accuracy });
          setMapCenter({ lat: latitude, lng: longitude });
          setZoomLevel(14);
          setIsLocating(false);
          setLocationToast({
            message: isBangla
              ? 'আপনার বর্তমান অবস্থান সফলভাবে চিহ্নিত হয়েছে।'
              : 'Current location detected successfully.',
            type: 'success'
          });
        } else {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (showErrorToast) {
          let msg = isBangla
            ? 'লোকেশন অ্যাক্সেস পাওয়া যায়নি। ঢাকার কেন্দ্রস্থল প্রদর্শিত হচ্ছে।'
            : 'Location permission denied. Showing central Dhaka.';
          if (err.code === 2) {
            msg = isBangla ? 'লোকেশন সিগন্যাল পাওয়া যায়নি।' : 'Location signal unavailable.';
          }
          setLocationToast({ message: msg, type: 'info' });
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (locationToast) {
      const timer = setTimeout(() => setLocationToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [locationToast]);

  useEffect(() => {
    if (searchQuery.trim().length > 3) {
      setDetectedCategory(detectServiceCategoryFromQuery(searchQuery));
    } else {
      setDetectedCategory(null);
    }
  }, [searchQuery]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Live location suggestions (instant local + debounced Nominatim)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const localHits = getLocalLocationSuggestions(q, isBangla, 5);
    setSuggestions(localHits);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const remoteHits = await searchNominatimBangladesh(q, isBangla, controller.signal);
      if (controller.signal.aborted) return;
      if (remoteHits.length > 0) {
        const merged: GeoSearchResult[] = [...localHits];
        for (const r of remoteHits) {
          const dup = merged.some(
            (m) => Math.abs(m.lat - r.lat) < 0.003 && Math.abs(m.lng - r.lng) < 0.003
          );
          if (!dup) merged.push(r);
        }
        setSuggestions(merged.slice(0, 6));
      }
    }, 320);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery, isBangla]);

  const applyGeoSearchResult = (res: GeoSearchResult) => {
    const targetZoom = res.zoom || 14;
    setMapCenter({ lat: res.lat, lng: res.lng });
    setZoomLevel(targetZoom);
    setFlySeq((s) => s + 1);
    setSearchedLocationPin({
      lat: res.lat,
      lng: res.lng,
      name: res.name
    });
    setLocationSearchActive(true);
    setShowSuggestions(false);
    safeFlyOrSetView(mapInstanceRef.current, res.lat, res.lng, targetZoom, { duration: 0.7 });
    setLocationToast({
      message: isBangla
        ? `📍 ${res.name} এলাকায় ম্যাপ ও লোকেশন আইকন নিয়ে যাওয়া হয়েছে`
        : `📍 Moved map & location pin to ${res.name}`,
      type: 'success'
    });
  };

  const handleLocationOrServiceSearch = async (rawQuery?: string, presetResult?: GeoSearchResult) => {
    if (presetResult) {
      setSearchQuery(presetResult.name);
      applyGeoSearchResult(presetResult);
      return;
    }

    const raw = (rawQuery !== undefined ? rawQuery : searchQuery).trim();
    const q = raw.toLowerCase();
    const cleanQ = q.replace(/[-_,./]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanQ) {
      setLocationToast({
        message: isBangla ? 'অনুগ্রহ করে যেকোনো এলাকার বা লোকেশনের নাম লিখুন!' : 'Please enter any area or location name!',
        type: 'info'
      });
      return;
    }

    setShowSuggestions(false);

    // 1. Instant local exact match (extended Dhaka areas, zones, 64 districts)
    const exactLocal = findExactLocalLocation(raw, isBangla);
    if (exactLocal) {
      applyGeoSearchResult(exactLocal);
      return;
    }

    // 2. Direct technician name match
    const matchedTechByName = technicians.find(
      (t) => t.name.toLowerCase().includes(cleanQ)
    );
    if (matchedTechByName && matchedTechByName.latitude && matchedTechByName.longitude) {
      setMapCenter({ lat: matchedTechByName.latitude, lng: matchedTechByName.longitude });
      setZoomLevel(15);
      setFlySeq((s) => s + 1);
      setSelectedTechId(matchedTechByName.id);
      setActivePopupTechId(matchedTechByName.id);
      setLocationSearchActive(false);
      setSearchedLocationPin({
        lat: matchedTechByName.latitude,
        lng: matchedTechByName.longitude,
        name: `${matchedTechByName.name} (${matchedTechByName.primaryArea})`
      });
      safeFlyOrSetView(mapInstanceRef.current, matchedTechByName.latitude, matchedTechByName.longitude, 15, { duration: 0.7 });
      setLocationToast({
        message: isBangla
          ? `👨‍🔧 ${matchedTechByName.name} (${matchedTechByName.primaryArea}) এর লোকেশনে পিন মুভ করা হয়েছে`
          : `👨‍🔧 Pinned at ${matchedTechByName.name} (${matchedTechByName.primaryArea})`,
        type: 'success'
      });
      return;
    }

    // 3. Check if explicitly a pure service keyword (with no location markers)
    const hasPlaceCue = /(road|রোড|street|স্ট্রিট|lane|লেন|sector|সেক্টর|block|ব্লক|bazar|বাজার|more|মোড়|মোড়|gate|গেট|para|পাড়া|পাড়া|pur|পুর|nagar|নগর|ganj|গঞ্জ|thana|থানা|district|জেলা|upazila|উপজেলা|moholla|মহল্লা|house|বাড়ি|বাড়ি|dhaka|ঢাকা)/i.test(cleanQ);
    const detectedCat = detectServiceCategoryFromQuery(q);
    const isShortPureService =
      !hasPlaceCue &&
      detectedCat !== null &&
      detectedCat !== 'other_services' &&
      cleanQ.split(' ').length <= 2;

    if (isShortPureService && detectedCat) {
      setSelectedCategory(detectedCat);
      setLocationSearchActive(false);
      const categoryPros = technicians.filter((t) => t.skills.includes(detectedCat));
      if (categoryPros.length > 0 && isValidLatLng(categoryPros[0].latitude, categoryPros[0].longitude)) {
        const lat = categoryPros[0].latitude as number;
        const lng = categoryPros[0].longitude as number;
        setMapCenter({ lat, lng });
        setZoomLevel(13);
        setFlySeq((s) => s + 1);
        safeFlyOrSetView(mapInstanceRef.current, lat, lng, 13, { duration: 0.65 });
      }
      setLocationToast({
        message: isBangla ? 'সার্ভিস ক্যাটাগরি অনুযায়ী ম্যাপ ফিল্টার করা হয়েছে' : 'Filtered map by service category',
        type: 'success'
      });
      return;
    }

    // 4. Full Bangladesh geocoding via OpenStreetMap Nominatim + fuzzy BD fallback
    const reqId = ++searchRequestSeqRef.current;
    setIsSearchingLocation(true);
    try {
      const geoResult = await geocodeBangladeshLocation(raw, isBangla);
      if (reqId !== searchRequestSeqRef.current) return;

      if (geoResult) {
        applyGeoSearchResult(geoResult);
        return;
      }

      // 5. Fallback: check technician area text or category keyword
      const matchedTechByArea = technicians.find(
        (t) =>
          t.primaryArea.toLowerCase().includes(cleanQ) ||
          t.serviceAreas.some((a) => a.toLowerCase().includes(cleanQ))
      );
      if (matchedTechByArea && matchedTechByArea.latitude && matchedTechByArea.longitude) {
        applyGeoSearchResult({
          lat: matchedTechByArea.latitude,
          lng: matchedTechByArea.longitude,
          name: matchedTechByArea.primaryArea || raw,
          zoom: 14,
          source: 'local'
        });
        return;
      }

      if (detectedCat && detectedCat !== 'other_services') {
        setSelectedCategory(detectedCat);
        setLocationSearchActive(false);
        setLocationToast({
          message: isBangla ? 'ক্যাটাগরি অনুযায়ী ম্যাপ ফিল্টার করা হয়েছে' : 'Filtered map by category',
          type: 'success'
        });
        return;
      }

      setLocationToast({
        message: isBangla
          ? `"${raw}" লোকেশনটি খুঁজে পাওয়া যায়নি। এলাকার নাম স্পষ্টভাবে লিখুন।`
          : `Could not locate "${raw}". Try specifying the area or district name.`,
        type: 'error'
      });
    } finally {
      if (reqId === searchRequestSeqRef.current) {
        setIsSearchingLocation(false);
      }
    }
  };

  const filteredTechnicians = useMemo(() => {
    const centerLat = searchedLocationPin?.lat || userLocation?.lat || DHAKA_CENTER.lat;
    const centerLng = searchedLocationPin?.lng || userLocation?.lng || DHAKA_CENTER.lng;

    return technicians
      .map((tech) => {
        const tLat = tech.latitude || DHAKA_CENTER.lat;
        const tLng = tech.longitude || DHAKA_CENTER.lng;
        const distKm = calculateHaversineDistance(centerLat, centerLng, tLat, tLng);
        const recScore = calculateRecommendationScore(tech, centerLat, centerLng);
        const recReasons = getRecommendationReasons(tech, centerLat, centerLng, isBangla);

        return {
          ...tech,
          calculatedDistanceKm: distKm,
          recommendationScore: recScore,
          recommendationReasons: recReasons
        };
      })
      .filter((tech) => {
        if (selectedCategory !== 'all' && !tech.skills.includes(selectedCategory)) return false;
        if (!locationSearchActive && distanceRadiusKm < 50 && tech.calculatedDistanceKm > distanceRadiusKm) return false;
        if (availabilityFilter === 'available' && tech.availability !== 'available') return false;
        if (availabilityFilter === 'busy' && tech.availability !== 'busy') return false;
        if (availabilityFilter === 'emergency' && !tech.emergencyAvailable) return false;
        if (minRating > 0 && tech.rating < minRating) return false;
        if (tech.startingPrice > maxPrice) return false;

        if (searchQuery.trim() && !locationSearchActive) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatches = tech.name.toLowerCase().includes(q);
          const areaMatches =
            tech.primaryArea.toLowerCase().includes(q) || tech.serviceAreas.some((a) => a.toLowerCase().includes(q));
          const bioMatches = tech.bioEn.toLowerCase().includes(q) || tech.bioBn.includes(q);
          const skillMatches = tech.skills.some((s) => s.toLowerCase().includes(q));
          const isKnownLoc = !!findExactLocalLocation(searchQuery, isBangla);
          if (!isKnownLoc && !nameMatches && !areaMatches && !bioMatches && !skillMatches) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recommended') return b.recommendationScore - a.recommendationScore;
        if (sortBy === 'nearest') return a.calculatedDistanceKm - b.calculatedDistanceKm;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'experience') return b.experienceYears - a.experienceYears;
        if (sortBy === 'price') return a.startingPrice - b.startingPrice;
        if (sortBy === 'available_first') {
          if (a.availability === 'available' && b.availability !== 'available') return -1;
          if (b.availability === 'available' && a.availability !== 'available') return 1;
          return b.rating - a.rating;
        }
        return 0;
      });
  }, [
    technicians,
    userLocation,
    searchedLocationPin,
    locationSearchActive,
    selectedCategory,
    distanceRadiusKm,
    availabilityFilter,
    minRating,
    maxPrice,
    searchQuery,
    sortBy,
    isBangla
  ]);

  const heatmapClusters = useMemo(() => {
    const areaClusters: Record<string, { lat: number; lng: number; count: number; name: string }> = {};
    filteredTechnicians.forEach((tech) => {
      const areaKey = tech.primaryArea || 'Dhaka';
      if (!areaClusters[areaKey]) {
        areaClusters[areaKey] = {
          lat: tech.latitude || DHAKA_CENTER.lat,
          lng: tech.longitude || DHAKA_CENTER.lng,
          count: 0,
          name: tech.primaryArea
        };
      }
      areaClusters[areaKey].count += 1;
    });
    return Object.values(areaClusters);
  }, [filteredTechnicians]);

  const handleTechMouseEnter = (techId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredTechId(techId);
  };

  const handleTechMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredTechId(null), 280);
  };

  const handleCardMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleCardMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredTechId(null), 280);
  };

  const handleSelectTechnician = (tech: Technician) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setSelectedTechId(tech.id);
    setActivePopupTechId((prev) => (prev === tech.id ? null : tech.id));
    if (onSelectTechnician) onSelectTechnician(tech);

    if (tech.latitude && tech.longitude) {
      setMapCenter({ lat: tech.latitude, lng: tech.longitude });
      setZoomLevel(15);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setAvailabilityFilter('all');
    setDistanceRadiusKm(25);
    setMinRating(0);
    setMaxPrice(5000);
    setSearchQuery('');
    setSortBy('recommended');
    setDetectedCategory(null);
    setSearchedLocationPin(null);
    setLocationSearchActive(false);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [DHAKA_CENTER.lat, DHAKA_CENTER.lng],
      zoom: 12,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false
    });

    const overlayGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    overlayLayerRef.current = overlayGroup;

    map.on('click', () => {
      setActivePopupTechId(null);
      setHoveredClusterIndex(null);
    });

    const detachResize = attachMapResizeObserver(mapContainerRef.current, map);

    return () => {
      detachResize();
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      overlayLayerRef.current = null;
    };
  }, []);

  // Tile switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layer = createResilientTileLayer(tileType, isDark).addTo(map);
    layer.bringToBack();
    tileLayerRef.current = layer;
  }, [tileType, isDark]);

  // Camera sync
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isValidLatLng(mapCenter.lat, mapCenter.lng)) return;
    if (!hasMountedCameraRef.current) {
      hasMountedCameraRef.current = true;
      safeFlyOrSetView(map, mapCenter.lat, mapCenter.lng, zoomLevel, { animate: false });
      return;
    }
    safeFlyOrSetView(map, mapCenter.lat, mapCenter.lng, zoomLevel, { duration: 0.65 });
  }, [mapCenter.lat, mapCenter.lng, zoomLevel, flySeq]);

  // Render Leaflet overlays (User Pin, Search Pin, Pros or Heatmap Clusters)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const overlayGroup = overlayLayerRef.current;
    if (!map || !overlayGroup) return;

    overlayGroup.clearLayers();

    // User geolocation marker & radius ring
    if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
      if (distanceRadiusKm < 50) {
        L.circle([userLocation.lat, userLocation.lng], {
          radius: distanceRadiusKm * 1000,
          color: '#f97316',
          fillColor: '#f97316',
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: '6 6'
        }).addTo(overlayGroup);
      }

      const userHtml = `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;transform:translate(-50%,-50%);">
          <span style="position:absolute;width:36px;height:36px;border-radius:9999px;background:rgba(249,115,22,0.35);"></span>
          <div style="width:22px;height:22px;border-radius:9999px;background:#ea580c;border:2px solid #ffffff;box-shadow:0 6px 14px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
            <span style="width:7px;height:7px;border-radius:9999px;background:#ffffff;"></span>
          </div>
        </div>
      `;

      L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: 'servexa-user-loc-icon',
          html: userHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        }),
        zIndexOffset: 900
      }).addTo(overlayGroup);
    }

    // Searched Location Pin
    if (searchedLocationPin && isValidLatLng(searchedLocationPin.lat, searchedLocationPin.lng)) {
      const safePinName = searchedLocationPin.name
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const pinHtml = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
          <div style="margin-bottom:5px;padding:4px 11px;border-radius:9999px;background:#09090b;color:#ffffff;border:2px solid #f97316;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 8px 22px rgba(0,0,0,0.5);">
            📍 ${safePinName}
          </div>
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;width:46px;height:46px;border-radius:9999px;background:rgba(249,115,22,0.28);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <div style="position:relative;width:36px;height:36px;border-radius:9999px 9999px 9999px 4px;transform:rotate(-45deg);background:linear-gradient(135deg,#f97316,#dc2626);color:#ffffff;display:flex;align-items:center;justify-content:center;border:2.5px solid #ffffff;box-shadow:0 10px 24px rgba(234,88,12,0.55);">
              <span style="transform:rotate(45deg);width:10px;height:10px;border-radius:9999px;background:#ffffff;display:block;"></span>
            </div>
          </div>
        </div>
      `;
      L.marker([searchedLocationPin.lat, searchedLocationPin.lng], {
        icon: L.divIcon({
          className: 'servexa-search-pin-icon',
          html: pinHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        }),
        zIndexOffset: 3800
      }).addTo(overlayGroup);
    }

    if (mapMode === 'HEATMAP') {
      heatmapClusters
        .filter((cluster) => cluster && isValidLatLng(cluster.lat, cluster.lng))
        .forEach((cluster, i) => {
          const intensity = Math.min(cluster.count / 4, 1);
          const color = intensity > 0.6 ? '#dc2626' : intensity > 0.3 ? '#ea580c' : '#f59e0b';

          L.circle([cluster.lat, cluster.lng], {
            radius: 1000,
            color,
            fillColor: color,
            fillOpacity: 0.28,
            weight: 2
          }).addTo(overlayGroup);

          const clusterHtml = `
            <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:9999px;background:${color};border:2px solid #ffffff;color:#ffffff;font-size:12px;font-weight:900;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,0.45);transform:translate(-50%,-50%);cursor:pointer;">
              <span>${cluster.name}</span>
              <span style="background:rgba(0,0,0,0.4);padding:1px 6px;border-radius:9999px;font-size:10px;font-family:monospace;">${cluster.count} ${isBangla ? 'জন' : 'pros'}</span>
            </div>
          `;

          const clusterMarker = L.marker([cluster.lat, cluster.lng], {
            icon: L.divIcon({
              className: 'servexa-cluster-icon',
              html: clusterHtml,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            }),
            zIndexOffset: 1000
          });

          clusterMarker.on('mouseover', () => setHoveredClusterIndex(i));
          clusterMarker.on('mouseout', () => setHoveredClusterIndex(null));
          clusterMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedCategory('all');
            setSearchQuery(cluster.name);
            setMapMode('PROS');
            setMapCenter({ lat: cluster.lat, lng: cluster.lng });
            setZoomLevel(14);
          });
          clusterMarker.addTo(overlayGroup);
        });
      return;
    }

    // PROS mode
    filteredTechnicians
      .filter((tech) => {
        if (!tech) return false;
        const lat = typeof tech.latitude === 'number' ? tech.latitude : DHAKA_CENTER.lat;
        const lng = typeof tech.longitude === 'number' ? tech.longitude : DHAKA_CENTER.lng;
        return isValidLatLng(lat, lng);
      })
      .forEach((tech) => {
        const hasValidCoords = isValidLatLng(tech.latitude, tech.longitude);
        const lat = hasValidCoords ? (tech.latitude as number) : DHAKA_CENTER.lat;
        const lng = hasValidCoords ? (tech.longitude as number) : DHAKA_CENTER.lng;
        const isSelected = selectedTechId === tech.id;
        const isCardOpen = hoveredTechId === tech.id || activePopupTechId === tech.id;

        const primarySkill = tech.skills[0] || 'other_services';
        const visualMeta = CATEGORY_VISUAL_MAP[primarySkill] || CATEGORY_VISUAL_MAP.other_services;
        const isAvailable = tech.availability === 'available';
        const isBusy = tech.availability === 'busy';
        const dotColor = isAvailable ? '#10b981' : isBusy ? '#f59e0b' : '#a1a1aa';

        const circle = L.circle([lat, lng], {
          radius: isCardOpen ? 680 : 480,
          color: '#f97316',
          fillColor: '#f97316',
          fillOpacity: isCardOpen ? 0.24 : 0.1,
          weight: isCardOpen ? 2 : 1
        });
        circle.on('mouseover', () => handleTechMouseEnter(tech.id));
        circle.on('mouseout', () => handleTechMouseLeave());
        circle.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          handleSelectTechnician(tech);
        });
        circle.addTo(overlayGroup);

        const pinHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-65%);cursor:pointer;user-select:none;">
            <div style="position:relative;width:40px;height:40px;border-radius:14px;background:${
              isSelected || isCardOpen ? '#ea580c' : isDark ? '#18181b' : '#ffffff'
            };border:2px solid #f97316;box-shadow:0 10px 22px rgba(0,0,0,0.38);display:flex;align-items:center;justify-content:center;font-size:18px;transform:${
              isSelected || isCardOpen ? 'scale(1.12)' : 'scale(1)'
            };transition:transform 0.2s;">
              <span>${visualMeta.emoji}</span>
              <span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:9999px;background:${dotColor};border:2px solid #ffffff;"></span>
            </div>
            <div style="margin-top:3px;padding:1px 6px;border-radius:6px;background:#09090b;color:#ffffff;font-size:9px;font-weight:900;font-family:monospace;box-shadow:0 4px 10px rgba(0,0,0,0.4);">
              ৳${tech.startingPrice}
            </div>
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #09090b;margin-top:-1px;"></div>
          </div>
        `;

        const techMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'servexa-tech-pin-icon',
            html: pinHtml,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          }),
          zIndexOffset: isCardOpen ? 3000 : isSelected ? 1500 : 200
        });

        techMarker.on('mouseover', () => handleTechMouseEnter(tech.id));
        techMarker.on('mouseout', () => handleTechMouseLeave());
        techMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          handleSelectTechnician(tech);
        });
        techMarker.addTo(overlayGroup);
      });
  }, [
    mapMode,
    filteredTechnicians,
    heatmapClusters,
    userLocation,
    distanceRadiusKm,
    searchedLocationPin,
    selectedTechId,
    hoveredTechId,
    activePopupTechId,
    isDark,
    isBangla
  ]);

  const activeCardTech = useMemo(() => {
    const id = activePopupTechId || hoveredTechId;
    if (!id || mapMode !== 'PROS') return null;
    return filteredTechnicians.find((t) => t.id === id) || null;
  }, [activePopupTechId, hoveredTechId, filteredTechnicians, mapMode]);

  const activeCluster = useMemo(() => {
    if (mapMode !== 'HEATMAP' || hoveredClusterIndex === null) return null;
    return heatmapClusters[hoveredClusterIndex] || null;
  }, [mapMode, hoveredClusterIndex, heatmapClusters]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const updatePoint = () => {
      if (activeCardTech && isValidLatLng(activeCardTech.latitude, activeCardTech.longitude)) {
        setCardPoint(safeLatLngToContainerPoint(map, activeCardTech.latitude, activeCardTech.longitude));
      } else if (activeCluster) {
        setCardPoint(safeLatLngToContainerPoint(map, activeCluster.lat, activeCluster.lng));
      } else {
        setCardPoint(null);
      }
    };

    updatePoint();
    map.on('move zoom viewreset resize', updatePoint);
    return () => {
      map.off('move zoom viewreset resize', updatePoint);
    };
  }, [activeCardTech?.id, activeCluster?.name]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    setMapCenter({ lat: DHAKA_CENTER.lat, lng: DHAKA_CENTER.lng });
    setZoomLevel(12);
    safeFlyOrSetView(mapInstanceRef.current, DHAKA_CENTER.lat, DHAKA_CENTER.lng, 12, { duration: 0.6 });
  };

  const containerWidth = mapContainerRef.current?.clientWidth || 780;
  const clampedX = cardPoint ? Math.max(165, Math.min(containerWidth - 165, cardPoint.x)) : 0;

  return (
    <div
      className={`kormigo-technician-map-root relative flex flex-col w-full h-full min-h-[500px] overflow-hidden ${className}`}
      style={{ height: height, minHeight: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Toast Notification */}
      {locationToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 backdrop-blur-md animate-in slide-in-from-top-4 duration-200 bg-white/95 dark:bg-zinc-900/95 border border-orange-500/40 text-zinc-900 dark:text-zinc-100">
          <Navigation className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span>{locationToast.message}</span>
          <button
            onClick={() => setLocationToast(null)}
            type="button"
            className="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOP FILTER & CONTROL BAR */}
      <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Smart Problem & Location Search Input */}
          <div ref={searchBoxRef} className="relative flex-1 min-w-[260px] max-w-xl flex items-center gap-1.5 z-30">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLocationOrServiceSearch();
              }}
              className="relative flex-1 flex items-center"
            >
              <button
                type="button"
                onClick={() => handleLocationOrServiceSearch()}
                disabled={isSearchingLocation}
                title={isBangla ? 'সার্চ করুন বা এলাকায় যান' : 'Search or Fly to Location'}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 transition-colors cursor-pointer p-0.5 disabled:opacity-60"
              >
                {isSearchingLocation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setShowSuggestions(val.trim().length >= 2);
                  if (!val.trim()) {
                    setLocationSearchActive(false);
                    setSearchedLocationPin(null);
                  } else {
                    setLocationSearchActive(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLocationOrServiceSearch();
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder={
                  isBangla
                    ? 'যেকোনো এলাকা বা লোকেশন লিখুন (যেমন: যাত্রাবাড়ী, চট্টগ্রাম, সাভার...)'
                    : 'Any area or location (e.g. Jatrabari, Savar, Chattogram...)'
                }
                className="w-full pl-8 pr-7 py-1.5 sm:py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchedLocationPin(null);
                    setLocationSearchActive(false);
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}

              {/* Location Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden z-50 divide-y divide-zinc-100 dark:divide-zinc-800 max-h-60 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <button
                      key={`${item.lat}-${item.lng}-${idx}`}
                      type="button"
                      onClick={() => handleLocationOrServiceSearch(item.name, item)}
                      className="w-full px-3 py-2 text-left hover:bg-orange-50 dark:hover:bg-zinc-800/80 flex items-center gap-2.5 text-xs transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.name}
                        </div>
                        {item.displayName && (
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {item.displayName}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <button
              type="button"
              disabled={isSearchingLocation}
              onClick={() => handleLocationOrServiceSearch()}
              title={isBangla ? 'লোকেশন বা সেবা খুঁজুন' : 'Search Location or Service'}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer active:scale-95 transition-all shrink-0 disabled:opacity-70"
            >
              {isSearchingLocation ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>{isSearchingLocation ? (isBangla ? 'খুঁজছে...' : 'Finding...') : isBangla ? 'সার্চ' : 'Search'}</span>
            </button>
          </div>

          {/* Desktop Quick Dropdowns */}
          <div className="hidden lg:flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all">{isBangla ? 'সব সেবা (All Services)' : 'All Services'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {CATEGORY_VISUAL_MAP[cat.id]?.emoji || '🔧'} {isBangla ? cat.nameBn : cat.nameEn}
                </option>
              ))}
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="all">{isBangla ? 'সকল প্রাপ্যতা' : 'All Availability'}</option>
              <option value="available">🟢 {isBangla ? 'এখনই এভেইলেবল' : 'Available Now'}</option>
              <option value="busy">🟡 {isBangla ? 'কাজে ব্যস্ত' : 'Busy'}</option>
              <option value="emergency">⚡ {isBangla ? 'জরুরি প্রস্তুত' : 'Emergency Ready'}</option>
            </select>

            <select
              value={distanceRadiusKm}
              onChange={(e) => setDistanceRadiusKm(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value={1}>{isBangla ? '১ কিমি ভেতরে' : 'Within 1 km'}</option>
              <option value={3}>{isBangla ? '৩ কিমি ভেতরে' : 'Within 3 km'}</option>
              <option value={5}>{isBangla ? '৫ কিমি ভেতরে' : 'Within 5 km'}</option>
              <option value={10}>{isBangla ? '১০ কিমি ভেতরে' : 'Within 10 km'}</option>
              <option value={25}>{isBangla ? '২৫ কিমি ভেতরে' : 'Within 25 km'}</option>
              <option value={50}>{isBangla ? 'পুরো ঢাকা মেট্রো' : 'All Dhaka'}</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="recommended">⭐ {isBangla ? 'সেরা প্রস্তাবিত' : 'Recommended'}</option>
              <option value="nearest">📍 {isBangla ? 'সবচেয়ে কাছে' : 'Nearest First'}</option>
              <option value="rating">★ {isBangla ? 'উচ্চ রেটিং' : 'Highest Rated'}</option>
              <option value="available_first">🟢 {isBangla ? 'এভেইলেবল আগে' : 'Available First'}</option>
              <option value="price">৳ {isBangla ? 'কম খরচ' : 'Lowest Price'}</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-stone-100 dark:bg-zinc-800 p-0.5 border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setMapMode('PROS')}
                type="button"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  mapMode === 'PROS' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isBangla ? 'পেশাজীবী পিন' : 'Pros'}</span>
              </button>
              <button
                onClick={() => setMapMode('HEATMAP')}
                type="button"
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  mapMode === 'HEATMAP' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isBangla ? 'হিটম্যাপ' : 'Density'}</span>
              </button>
            </div>

            <button
              onClick={() => handleRequestLocation(true)}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isBangla ? 'আমার অবস্থান' : 'My Location'}</span>
            </button>

            <button
              onClick={() => setShowFilterDrawer(true)}
              type="button"
              className="lg:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-700 hover:text-orange-500 cursor-pointer"
            >
              <Filter className="w-4 h-4" />
            </button>

            {(selectedCategory !== 'all' ||
              availabilityFilter !== 'all' ||
              searchQuery ||
              distanceRadiusKm < 25) && (
              <button
                onClick={handleResetFilters}
                type="button"
                className="p-2 rounded-xl text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
                title={isBangla ? 'রিসেট' : 'Reset'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Dhaka Location Jump Pills */}
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-zinc-500 shrink-0 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-orange-500" />
            <span>{isBangla ? 'দ্রুত এলাকায় যান:' : 'Quick Jump:'}</span>
          </span>
          {['মিরপুর', 'উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মোহাম্মদপুর', 'ফার্মগেট', 'পুরান ঢাকা'].map(
            (place) => (
              <button
                key={place}
                type="button"
                onClick={() => {
                  setSearchQuery(place);
                  handleLocationOrServiceSearch(place);
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-orange-500/15 hover:text-orange-600 dark:hover:text-orange-400 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors cursor-pointer active:scale-95"
              >
                {place}
              </button>
            )
          )}
        </div>

        {/* Dynamic Professionals Count Bar */}
        <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              {isBangla
                ? `ম্যাপে ${toBengaliNumber(filteredTechnicians.length)} জন প্রস্তুত পেশাজীবী প্রদর্শিত হচ্ছে`
                : `Showing ${filteredTechnicians.length} active professionals on live map`}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {isBangla ? 'যেকোনো মার্কারে ক্লিক করে সরাসরি বুকিং করুন' : 'Click any marker to view details & book'}
          </span>
        </div>
      </div>

      {/* FULL-WIDTH MAP VIEWPORT CONTAINER */}
      <div className="relative flex-1 w-full h-full min-h-[450px] overflow-hidden">
        <div
          ref={mapContainerRef}
          className="w-full h-full absolute inset-0 z-0 bg-stone-200 dark:bg-zinc-950"
        />

        {/* Floating Technician Detail Card */}
        {activeCardTech && cardPoint && (() => {
          const primarySkill = activeCardTech.skills[0] || 'other_services';
          const visualMeta = CATEGORY_VISUAL_MAP[primarySkill] || CATEGORY_VISUAL_MAP.other_services;
          const categoryName = isBangla
            ? categories.find((c) => c.id === primarySkill)?.nameBn || visualMeta.nameBn
            : categories.find((c) => c.id === primarySkill)?.nameEn || visualMeta.nameEn;
          const isAvailable = activeCardTech.availability === 'available';
          const isBusy = activeCardTech.availability === 'busy';
          const statusDotColor = isAvailable ? 'bg-emerald-500' : isBusy ? 'bg-amber-500' : 'bg-zinc-400';

          return (
            <div
              style={{
                left: `${clampedX}px`,
                top: `${Math.max(220, cardPoint.y - 34)}px`,
                transform: 'translate(-50%, -100%)'
              }}
              className="absolute z-30 pointer-events-auto w-[290px] sm:w-[320px] rounded-2xl bg-white/98 dark:bg-zinc-900/98 backdrop-blur-md border border-orange-500/40 shadow-2xl p-4 text-left font-sans animate-in fade-in zoom-in-95 duration-150"
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
              onClick={(e) => e.stopPropagation()}
            >
              {activePopupTechId === activeCardTech.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePopupTechId(null);
                    setSelectedTechId(null);
                    setHoveredTechId(null);
                  }}
                  type="button"
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                  title="Close"
                >
                  ✕
                </button>
              )}

              <div className="flex items-center justify-between gap-1.5 mb-2.5 pr-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[11px] font-black">
                  <span>{visualMeta.emoji}</span>
                  <span className="truncate">{categoryName}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isAvailable
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : isBusy
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-zinc-500/15 text-zinc-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor} ${isAvailable ? 'animate-pulse' : ''}`} />
                  <span>
                    {isAvailable
                      ? isBangla
                        ? 'এখনই প্রস্তুত'
                        : 'Available'
                      : isBusy
                      ? isBangla
                        ? 'কাজে ব্যস্ত'
                        : 'Busy'
                      : isBangla
                      ? 'অফলাইন'
                      : 'Offline'}
                  </span>
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  {activeCardTech.avatar?.trim() ? (
                    <img
                      src={activeCardTech.avatar}
                      alt={activeCardTech.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-orange-500/40 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-orange-600 text-white font-black text-base flex items-center justify-center border-2 border-orange-500/40 shadow-sm">
                      {(activeCardTech.name || 'T').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {activeCardTech.platformVerified && (
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-zinc-900"
                      title="Verified Pro"
                    >
                      ✓
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                    <span>{activeCardTech.name}</span>
                  </h4>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                    <span className="truncate">{activeCardTech.primaryArea}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-orange-600 dark:text-orange-400 font-bold">
                      {formatDistance(activeCardTech.calculatedDistanceKm, isBangla)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mt-3 py-1.5 px-2 bg-stone-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-center text-[10px]">
                <div>
                  <div className="font-extrabold text-amber-500 flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{activeCardTech.rating}</span>
                  </div>
                  <div className="text-[8px] text-zinc-400">
                    {activeCardTech.reviewCount} {isBangla ? 'রিভিউ' : 'reviews'}
                  </div>
                </div>
                <div className="border-x border-zinc-200 dark:border-zinc-700 px-1">
                  <div className="font-bold text-zinc-700 dark:text-zinc-200">
                    {activeCardTech.experienceYears} {isBangla ? 'বছর' : 'yrs'}
                  </div>
                  <div className="text-[8px] text-zinc-400">{isBangla ? 'অভিজ্ঞতা' : 'exp'}</div>
                </div>
                <div>
                  <div className="font-bold text-orange-600 dark:text-orange-400">
                    ৳{activeCardTech.startingPrice}
                  </div>
                  <div className="text-[8px] text-zinc-400">{isBangla ? 'শুরু মূল্য' : 'from'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/professionals/${activeCardTech.id}`);
                  }}
                  type="button"
                  className="w-full py-2 px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span>{isBangla ? 'প্রোফাইল দেখুন' : 'View Profile'}</span>
                  <ArrowRight className="w-3 h-3 text-orange-500" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/book?techId=${activeCardTech.id}`);
                  }}
                  type="button"
                  className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md shadow-orange-600/25 transition-all cursor-pointer active:scale-95"
                >
                  <span>{isBangla ? 'বুক করুন' : 'Book Now'}</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Heatmap Cluster Hover Card */}
        {activeCluster && cardPoint && (
          <div
            style={{
              left: `${clampedX}px`,
              top: `${Math.max(150, cardPoint.y - 24)}px`,
              transform: 'translate(-50%, -100%)'
            }}
            className="absolute z-30 pointer-events-none w-64 rounded-2xl bg-white/98 dark:bg-zinc-900/98 backdrop-blur-md border border-orange-500/40 shadow-2xl p-3.5 text-left font-sans animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">
                {isBangla ? 'সার্ভিস হটস্পট জোন' : 'Service Hotspot'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold">
                {activeCluster.count > 2 ? '🔥 উচ্চ চাহিদা' : 'মাঝারি চাহিদা'}
              </span>
            </div>
            <h4 className="font-black text-sm text-zinc-900 dark:text-white">{activeCluster.name}</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {isBangla
                ? `${activeCluster.count} জন পেশাজীবী এই জোনে সেবায় প্রস্তুত আছেন। ক্লিক করে জুম করুন।`
                : `${activeCluster.count} verified professionals active in this coverage area. Click to zoom.`}
            </p>
          </div>
        )}

        {/* Floating Map Controls (Top Right) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              type="button"
              className="p-2.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-xl hover:text-orange-500 transition-colors cursor-pointer"
              title={isBangla ? 'ম্যাপ লেয়ার পরিবর্তন' : 'Change Map Layer'}
            >
              <Layers className="w-4 h-4" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-1.5 space-y-1 text-xs font-semibold z-20">
                <button
                  onClick={() => {
                    setTileType('THEMED');
                    setShowLayerMenu(false);
                  }}
                  type="button"
                  className={`w-full text-left px-2 py-1.5 rounded-lg cursor-pointer ${
                    tileType === 'THEMED'
                      ? 'bg-orange-500 text-white'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  🎨 {isDark ? 'Dark Theme' : 'Light Theme'}
                </button>
                <button
                  onClick={() => {
                    setTileType('SATELLITE');
                    setShowLayerMenu(false);
                  }}
                  type="button"
                  className={`w-full text-left px-2 py-1.5 rounded-lg cursor-pointer ${
                    tileType === 'SATELLITE'
                      ? 'bg-orange-500 text-white'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  🛰️ Satellite
                </button>
                <button
                  onClick={() => {
                    setTileType('TERRAIN');
                    setShowLayerMenu(false);
                  }}
                  type="button"
                  className={`w-full text-left px-2 py-1.5 rounded-lg cursor-pointer ${
                    tileType === 'TERRAIN'
                      ? 'bg-orange-500 text-white'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  ⛰️ OpenStreetMap
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col bg-white/95 dark:bg-zinc-900/95 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            <button
              onClick={handleZoomIn}
              type="button"
              className="p-2.5 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              type="button"
              className="p-2.5 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleRecenter}
              type="button"
              className="p-2.5 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={isBangla ? 'ঢাকা সেন্টারে ফিরুন' : 'Recenter Dhaka'}
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Map Legend */}
        <div className="hidden sm:block absolute bottom-6 right-4 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-2.5 shadow-lg text-[10px] space-y-1 max-w-[200px]">
          <div className="font-bold text-zinc-700 dark:text-zinc-300 pb-1 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span>{isBangla ? 'চিহ্ন পরিচিতি' : 'Map Legend'}</span>
            <span className="text-[9px] text-orange-500 font-mono">Servexa</span>
          </div>

          {mapMode === 'HEATMAP' ? (
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span>{isBangla ? 'উচ্চ চাহিদা ও কল' : 'High Surge Demand'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>{isBangla ? 'মাঝারি চাহিদা' : 'Moderate Activity'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>{isBangla ? 'এখনই প্রস্তুত (Available)' : 'Available Now'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 flex items-center justify-center text-[7px] text-white">
                  📍
                </span>
                <span>{isBangla ? 'আপনার অবস্থান (You)' : 'Your Location'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FILTER MODAL / DRAWER */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-sm h-full bg-white dark:bg-zinc-900 p-5 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                  {isBangla ? 'ফিল্টার এবং অপশন' : 'Filters & Options'}
                </h3>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  type="button"
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {isBangla ? 'সেবা ক্যাটাগরি:' : 'Service Category:'}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                >
                  <option value="all">{isBangla ? 'সব সেবা' : 'All Services'}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {isBangla ? cat.nameBn : cat.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {isBangla ? 'দূরত্ব ব্যাসার্ধ:' : 'Distance Radius:'}
                </label>
                <div className="flex items-center justify-between text-sm font-black text-zinc-900 dark:text-white">
                  <span>
                    {distanceRadiusKm < 50
                      ? `${toBengaliNumber(distanceRadiusKm)} কিমি`
                      : isBangla
                      ? 'পুরো ঢাকা'
                      : 'All Dhaka'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={distanceRadiusKm}
                  onChange={(e) => setDistanceRadiusKm(Number(e.target.value))}
                  className="w-full accent-orange-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {isBangla ? 'সাজানোর ধরন:' : 'Sort By:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['recommended', 'nearest', 'rating', 'price'] as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSortBy(opt)}
                      type="button"
                      className={`p-2 rounded-xl text-xs font-bold border text-center capitalize cursor-pointer transition-colors ${
                        sortBy === opt
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFilterDrawer(false)}
              type="button"
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-orange-500/20 cursor-pointer"
            >
              {isBangla ? 'ফিল্টার প্রয়োগ করুন' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
