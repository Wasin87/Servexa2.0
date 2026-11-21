import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Clock,
  Route as RouteIcon,
  LocateFixed,
  Bike,
  Car,
  Footprints,
  ExternalLink,
  RefreshCw,
  Phone,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Flag,
  Layers,
  Maximize2,
  X,
  Compass,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Booking, Technician } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  DHAKA_CENTER,
  resolveCustomerCoordinates,
  formatDistanceExact,
  formatDurationMinutes,
  buildFallbackDhakaRoute,
  toBengaliNumber,
  isValidLatLng,
  safeFlyOrSetView,
  attachMapResizeObserver
} from '../../utils/geoUtils';
import { createResilientTileLayer } from '../../utils/mapTiles';

export type RouteTravelMode = 'TWO_WHEELER' | 'DRIVING' | 'WALKING';

export interface RouteStepSummary {
  instruction: string;
  distanceText: string;
  durationText: string;
  directionKey: 'straight' | 'left' | 'right' | 'destination';
}

export interface ComputedRouteSummary {
  distanceMeters: number;
  durationMinutes: number;
  source: 'osrm_routes' | 'dhaka_estimate';
  steps: RouteStepSummary[];
}

export interface TechnicianRouteMapProps {
  booking: Booking;
  technician: Technician;
  height?: string;
  compact?: boolean;
  viewerRole?: 'technician' | 'customer';
  onExpandModal?: () => void;
  onCloseModal?: () => void;
}

function classifyDirectionKey(maneuverType?: string, modifier?: string): RouteStepSummary['directionKey'] {
  const m = `${maneuverType || ''} ${modifier || ''}`.toLowerCase();
  if (m.includes('arrive')) return 'destination';
  if (m.includes('left')) return 'left';
  if (m.includes('right')) return 'right';
  return 'straight';
}

export const TechnicianRouteMap: React.FC<TechnicianRouteMapProps> = ({
  booking,
  technician,
  height = '360px',
  compact = false,
  viewerRole = 'technician',
  onExpandModal,
  onCloseModal
}) => {
  const { isBangla } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const latestBoundsRef = useRef<L.LatLngBounds | null>(null);

  const customerLocation = useMemo(() => {
    if (
      typeof booking.customerLat === 'number' &&
      typeof booking.customerLng === 'number' &&
      !isNaN(booking.customerLat) &&
      !isNaN(booking.customerLng)
    ) {
      return {
        lat: booking.customerLat,
        lng: booking.customerLng,
        areaLabel: booking.customerArea
      };
    }
    const resolved = resolveCustomerCoordinates(
      booking.customerArea,
      booking.customerAddress,
      booking.id,
      booking.customerDistrict || booking.customerCity
    );
    return {
      lat: resolved.lat,
      lng: resolved.lng,
      areaLabel: isBangla ? resolved.matchedAreaBn : resolved.matchedAreaEn
    };
  }, [booking, isBangla]);

  const fallbackTechLocation = useMemo(() => {
    if (
      typeof technician.latitude === 'number' &&
      typeof technician.longitude === 'number' &&
      !isNaN(technician.latitude) &&
      !isNaN(technician.longitude)
    ) {
      return { lat: technician.latitude, lng: technician.longitude };
    }
    const resolvedTechArea = resolveCustomerCoordinates(
      technician.primaryArea || 'Mirpur',
      '',
      technician.id,
      technician.district || technician.city
    );
    return { lat: resolvedTechArea.lat, lng: resolvedTechArea.lng };
  }, [technician]);

  const [techPos, setTechPos] = useState<{ lat: number; lng: number }>(fallbackTechLocation);
  const [gpsStatus, setGpsStatus] = useState<'gps_live' | 'locating' | 'area_fallback'>('locating');
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState<boolean>(true);
  const [travelMode, setTravelMode] = useState<RouteTravelMode>('TWO_WHEELER');
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [recenterSignal, setRecenterSignal] = useState<number>(0);
  const [showAllSteps, setShowAllSteps] = useState<boolean>(!compact);
  const [routeSummary, setRouteSummary] = useState<ComputedRouteSummary | null>(null);

  // Live GPS acquisition & watchPosition (only when viewed by the technician)
  useEffect(() => {
    if (viewerRole !== 'technician') {
      setTechPos(fallbackTechLocation);
      setGpsStatus('area_fallback');
      return;
    }

    if (!navigator.geolocation) {
      setTechPos(fallbackTechLocation);
      setGpsStatus('area_fallback');
      return;
    }

    setGpsStatus('locating');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isNaN(latitude) && !isNaN(longitude)) {
          setTechPos({ lat: latitude, lng: longitude });
          setGpsStatus('gps_live');
        }
      },
      () => {
        setTechPos(fallbackTechLocation);
        setGpsStatus('area_fallback');
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 15000 }
    );

    if (!liveTrackingEnabled) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isNaN(latitude) && !isNaN(longitude)) {
          setTechPos({ lat: latitude, lng: longitude });
          setGpsStatus('gps_live');
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [fallbackTechLocation, liveTrackingEnabled, viewerRole]);

  const handleManualGpsRefresh = () => {
    if (!navigator.geolocation) {
      setTechPos(fallbackTechLocation);
      setGpsStatus('area_fallback');
      setRecenterSignal((s) => s + 1);
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (isValidLatLng(latitude, longitude)) {
          setTechPos({ lat: latitude, lng: longitude });
          setGpsStatus('gps_live');
        } else {
          setTechPos(fallbackTechLocation);
          setGpsStatus('area_fallback');
        }
        setRecenterSignal((s) => s + 1);
      },
      () => {
        setTechPos(fallbackTechLocation);
        setGpsStatus('area_fallback');
        setRecenterSignal((s) => s + 1);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const rawMidLat = (techPos.lat + customerLocation.lat) / 2;
    const rawMidLng = (techPos.lng + customerLocation.lng) / 2;
    const midLat = isValidLatLng(rawMidLat, rawMidLng) ? rawMidLat : DHAKA_CENTER.lat;
    const midLng = isValidLatLng(rawMidLat, rawMidLng) ? rawMidLng : DHAKA_CENTER.lng;

    const map = L.map(mapContainerRef.current, {
      center: [midLat, midLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    const routeGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    routeLayerRef.current = routeGroup;

    const detachResize = attachMapResizeObserver(mapContainerRef.current, map, () => {
      const size = map.getSize();
      if (latestBoundsRef.current && latestBoundsRef.current.isValid() && size && size.x > 0 && size.y > 0) {
        try {
          map.fitBounds(latestBoundsRef.current, { padding: [54, 54], maxZoom: 16, animate: false });
        } catch {
          // Ignore resize fit failure
        }
      }
    });

    return () => {
      detachResize();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // Tile layer management
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layer = createResilientTileLayer(
      mapType === 'hybrid' ? 'SATELLITE' : 'THEMED',
      isDark
    ).addTo(map);
    layer.bringToBack();
    tileLayerRef.current = layer;
  }, [mapType, isDark]);

  // Compute & Draw Shortest Route + Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = routeLayerRef.current;
    if (!map || !group) return;

    let cancelled = false;
    const controller = new AbortController();

    const drawRouteAndMarkers = (latLngs: [number, number][]) => {
      if (cancelled) return;
      const map = mapInstanceRef.current;
      const layer = routeLayerRef.current;
      if (!layer || !map) return;
      layer.clearLayers();

      const validLatLngs = latLngs.filter(([lat, lng]) => isValidLatLng(lat, lng));

      if (validLatLngs.length >= 2) {
        // Outer warm orange glow casing
        L.polyline(validLatLngs, {
          color: '#ea580c',
          weight: 11,
          opacity: 0.42,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layer);

        // Inner bright amber-orange core path
        L.polyline(validLatLngs, {
          color: '#f59e0b',
          weight: 5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layer);
      }

      const techLat = isValidLatLng(techPos.lat, techPos.lng) ? techPos.lat : DHAKA_CENTER.lat;
      const techLng = isValidLatLng(techPos.lat, techPos.lng) ? techPos.lng : DHAKA_CENTER.lng;
      const custLat = isValidLatLng(customerLocation.lat, customerLocation.lng)
        ? customerLocation.lat
        : DHAKA_CENTER.lat;
      const custLng = isValidLatLng(customerLocation.lat, customerLocation.lng)
        ? customerLocation.lng
        : DHAKA_CENTER.lng;

      // Marker 1: Technician
      const safeName = (technician.name || 'Technician')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const techMarkerTitle =
        viewerRole === 'customer'
          ? isBangla
            ? `মিস্ত্রি: ${safeName}`
            : `Tech: ${safeName}`
          : isBangla
            ? 'আপনি (টেকনিশিয়ান)'
            : 'You (Tech)';
      const rawAvatar = technician.avatar?.trim() || '';
      const isSafeAvatarUrl = /^(https?:\/\/|data:image\/|\/)/i.test(rawAvatar);
      const safeAvatarUrl = rawAvatar.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const techAvatarHtml = isSafeAvatarUrl
        ? `<img src="${safeAvatarUrl}" alt="${safeName}" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover;" />`
        : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;color:#ffffff;font-weight:900;font-size:14px;">${(safeName || 'T').charAt(0).toUpperCase()}</span>`;
      const techHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-85%);user-select:none;">
          <div style="padding:2px 8px;border-radius:9999px;background:#059669;color:#ffffff;font-size:10px;font-weight:900;border:1px solid #ffffff;white-space:nowrap;margin-bottom:4px;box-shadow:0 4px 12px rgba(0,0,0,0.35);">
            🧭 ${techMarkerTitle}
          </div>
          <div style="width:36px;height:36px;border-radius:9999px;background:#059669;border:2px solid #ffffff;overflow:hidden;box-shadow:0 8px 18px rgba(0,0,0,0.45);">
            ${techAvatarHtml}
          </div>
        </div>
      `;
      L.marker([techLat, techLng], {
        icon: L.divIcon({
          className: 'servexa-route-tech-icon',
          html: techHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        }),
        zIndexOffset: 800
      }).addTo(layer);

      // Marker 2: Customer
      const custShort = booking.customerName.split('(')[0].trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const custMarkerTitle =
        viewerRole === 'customer'
          ? isBangla
            ? 'আপনার ঠিকানা'
            : 'Your Location'
          : isBangla
            ? `গ্রাহক: ${custShort}`
            : `Customer: ${custShort}`;
      const custHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);user-select:none;">
          <div style="padding:3px 9px;border-radius:10px;background:#09090b;color:#fcd34d;font-size:10px;font-weight:900;border:1px solid rgba(251,191,36,0.7);white-space:nowrap;margin-bottom:4px;box-shadow:0 6px 16px rgba(0,0,0,0.45);">
            ● ${custMarkerTitle}
          </div>
          <div style="width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,#fbbf24,#f97316,#ea580c);color:#ffffff;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 10px 22px rgba(0,0,0,0.45);">
            📍
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #ea580c;"></div>
        </div>
      `;
      L.marker([custLat, custLng], {
        icon: L.divIcon({
          className: 'servexa-route-cust-icon',
          html: custHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        }),
        zIndexOffset: 900
      }).addTo(layer);

      const bounds = L.latLngBounds(
        validLatLngs.length >= 2
          ? validLatLngs
          : [
              [techLat, techLng],
              [custLat, custLng]
            ]
      );
      latestBoundsRef.current = bounds;
      map.invalidateSize({ animate: false });
      const size = map.getSize();
      if (bounds.isValid() && size && Number.isFinite(size.x) && Number.isFinite(size.y) && size.x > 0 && size.y > 0) {
        try {
          map.fitBounds(bounds, { padding: [54, 54], maxZoom: 16 });
        } catch {
          safeFlyOrSetView(map, (techLat + custLat) / 2, (techLng + custLng) / 2, 13, { animate: false });
        }
      } else {
        safeFlyOrSetView(map, (techLat + custLat) / 2, (techLng + custLng) / 2, 13, { animate: false });
      }
    };

    const applyFallback = () => {
      const fb = buildFallbackDhakaRoute(
        techPos,
        { lat: customerLocation.lat, lng: customerLocation.lng },
        booking.customerArea,
        booking.customerAddress,
        travelMode,
        isBangla
      );
      drawRouteAndMarkers(fb.path.map((p) => [p.lat, p.lng]));
      setRouteSummary({
        distanceMeters: fb.distanceMeters,
        durationMinutes: fb.durationMinutes,
        source: 'dhaka_estimate',
        steps: fb.steps
      });
    };

    const computeRoute = async () => {
      // Draw instant fallback immediately so user sees map & route without delay
      applyFallback();

      try {
        const timer = setTimeout(() => controller.abort(), 2800);
        const profile = travelMode === 'WALKING' ? 'foot' : 'driving';
        const url = `https://router.project-osrm.org/route/v1/${profile}/${techPos.lng},${techPos.lat};${customerLocation.lng},${customerLocation.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled || !data?.routes?.length) return;

        const shortest = [...data.routes].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0];
        const coords: [number, number][] = (shortest.geometry?.coordinates || []).map(
          (c: [number, number]) => [c[1], c[0]]
        );

        if (coords.length < 2) return;

        const distanceMeters = Math.round(shortest.distance || 0);
        // Bike is ~25% faster than city car average in Dhaka
        const rawSeconds = shortest.duration || 300;
        const adjustedMinutes = Math.max(
          2,
          Math.round((travelMode === 'TWO_WHEELER' ? rawSeconds * 0.78 : rawSeconds) / 60)
        );

        const legSteps: any[] = shortest.legs?.[0]?.steps || [];
        const parsedSteps: RouteStepSummary[] = legSteps
          .map((s) => {
            const road = s.name ? (isBangla ? `${s.name} সড়ক ধরে এগিয়ে যান` : `Continue along ${s.name}`) : s.maneuver?.type === 'arrive'
              ? isBangla
                ? `গ্রাহকের ঠিকানায় পৌঁছান: ${booking.customerAddress}`
                : `Arrive at customer location: ${booking.customerAddress}`
              : isBangla
              ? 'প্রধান সড়ক ধরে এগিয়ে যান'
              : 'Continue on connecting road';
            const stepMins = Math.max(1, Math.round((s.duration || 60) / 60));
            return {
              instruction: road,
              distanceText: formatDistanceExact(Math.round(s.distance || 80), isBangla),
              durationText: formatDurationMinutes(stepMins, isBangla),
              directionKey: classifyDirectionKey(s.maneuver?.type, s.maneuver?.modifier)
            };
          })
          .filter((st) => st.instruction.length > 0);

        const fbGuide = buildFallbackDhakaRoute(
          techPos,
          { lat: customerLocation.lat, lng: customerLocation.lng },
          booking.customerArea,
          booking.customerAddress,
          travelMode,
          isBangla
        );

        if (cancelled || !mapInstanceRef.current || !routeLayerRef.current) return;
        drawRouteAndMarkers(coords);
        setRouteSummary({
          distanceMeters: distanceMeters || fbGuide.distanceMeters,
          durationMinutes: adjustedMinutes || fbGuide.durationMinutes,
          source: 'osrm_routes',
          steps: parsedSteps.length > 0 ? parsedSteps : fbGuide.steps
        });
      } catch {
        // Keep the cleanly rendered fallback route
      }
    };

    computeRoute();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    techPos.lat,
    techPos.lng,
    customerLocation.lat,
    customerLocation.lng,
    travelMode,
    booking.customerArea,
    booking.customerAddress,
    booking.customerName,
    technician.name,
    technician.avatar,
    isBangla,
    recenterSignal
  ]);

  const estimatedArrivalClock = useMemo(() => {
    if (!routeSummary) return null;
    const etaDate = new Date(Date.now() + routeSummary.durationMinutes * 60 * 1000);
    return etaDate.toLocaleTimeString(isBangla ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [routeSummary, isBangla]);

  const externalDirectionsUrl = useMemo(() => {
    const modeParam =
      travelMode === 'WALKING' ? 'walking' : travelMode === 'TWO_WHEELER' ? 'two-wheeler' : 'driving';
    return `https://www.google.com/maps/dir/?api=1&origin=${techPos.lat},${techPos.lng}&destination=${customerLocation.lat},${customerLocation.lng}&travelmode=${modeParam}`;
  }, [techPos, customerLocation, travelMode]);

  const renderStepIcon = (key: RouteStepSummary['directionKey']) => {
    switch (key) {
      case 'left':
        return <CornerUpLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'right':
        return <CornerUpRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'destination':
        return <Flag className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
      default:
        return <ArrowUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    }
  };

  return (
    <div className="rounded-2xl border-2 border-amber-500/40 bg-white dark:bg-zinc-950 overflow-hidden shadow-lg">
      {/* Top Technician Route Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black tracking-tight flex items-center gap-1.5 truncate">
              <span>
                {viewerRole === 'customer'
                  ? isBangla
                    ? 'লাইভ টেকনিশিয়ান ট্র্যাকিং ও রুট'
                    : 'Live Technician Tracking & Route'
                  : isBangla
                    ? 'গ্রাহকের লোকেশন ও সংক্ষিপ্ত রুট নেভিগেশন'
                    : 'Customer Route Navigation'}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/25 text-[10px] font-mono">
                #{booking.bookingNumber}
              </span>
            </div>
            <div className="text-[11px] text-orange-50 truncate">
              {viewerRole === 'customer'
                ? `🛠️ ${technician.name} · 📍 ${booking.customerArea}`
                : `📍 ${booking.customerName} · ${booking.customerAddress}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {viewerRole === 'customer' ? (
            <span className="px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>{isBangla ? 'লাইভ রুট' : 'Live Route'}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleManualGpsRefresh}
              className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title={isBangla ? 'আমার লাইভ GPS আপডেট করুন' : 'Refresh Live GPS'}
            >
              <LocateFixed className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
              <span>
                {gpsStatus === 'gps_live'
                  ? isBangla
                    ? 'লাইভ GPS চালু'
                    : 'Live GPS'
                  : gpsStatus === 'locating'
                  ? isBangla
                    ? 'খুঁজছে...'
                    : 'Locating...'
                  : isBangla
                  ? `${technician.primaryArea} হাব`
                  : `${technician.primaryArea} Hub`}
              </span>
            </button>
          )}

          {onExpandModal && (
            <button
              type="button"
              onClick={onExpandModal}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer transition-colors"
              title={isBangla ? 'বড় স্ক্রিনে দেখুন' : 'Full Screen Map'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer transition-colors"
              title={isBangla ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Summary Strip */}
      <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 bg-amber-50/70 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800">
        <div className="p-2.5 sm:p-3 text-center sm:text-left">
          <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center justify-center sm:justify-start gap-1">
            <RouteIcon className="w-3 h-3 text-orange-500" />
            <span>{isBangla ? 'মোট দূরত্ব' : 'Total Distance'}</span>
          </div>
          <div className="text-sm sm:text-base font-black text-zinc-900 dark:text-white mt-0.5">
            {routeSummary ? formatDistanceExact(routeSummary.distanceMeters, isBangla) : '...'}
          </div>
        </div>

        <div className="p-2.5 sm:p-3 text-center sm:text-left">
          <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center justify-center sm:justify-start gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>{isBangla ? 'পৌঁছাতে সময় লাগবে' : 'Est. Travel Time'}</span>
          </div>
          <div className="text-sm sm:text-base font-black text-orange-600 dark:text-amber-400 mt-0.5">
            {routeSummary ? formatDurationMinutes(routeSummary.durationMinutes, isBangla) : '...'}
          </div>
          {estimatedArrivalClock && (
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {isBangla ? `সম্ভাব্য পৌঁছানো: ~${estimatedArrivalClock}` : `ETA ~${estimatedArrivalClock}`}
            </div>
          )}
        </div>

        <div className="p-2.5 sm:p-3 text-center sm:text-left">
          <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center justify-center sm:justify-start gap-1">
            <span className="w-3 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-600 inline-block" />
            <span>{isBangla ? 'সংক্ষিপ্ত রুট' : 'Shortest Path'}</span>
          </div>
          <div className="text-[11px] sm:text-xs font-extrabold text-amber-700 dark:text-amber-300 mt-1">
            {isBangla ? 'হলুদ-কমলা পথ অনুসরণ করুন' : 'Yellow-Orange Route'}
          </div>
        </div>
      </div>

      {/* Mode Switcher & Map Controls Bar */}
      <div className="px-3 py-2 bg-stone-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTravelMode('TWO_WHEELER')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
              travelMode === 'TWO_WHEELER'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>{isBangla ? 'মোটরবাইক' : 'Bike'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTravelMode('DRIVING')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
              travelMode === 'DRIVING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>{isBangla ? 'গাড়ি' : 'Car'}</span>
          </button>

          <button
            type="button"
            onClick={() => setTravelMode('WALKING')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
              travelMode === 'WALKING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>{isBangla ? 'হাঁটা' : 'Walk'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLiveTrackingEnabled((v) => !v)}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer border transition-colors ${
              liveTrackingEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${liveTrackingEnabled ? 'bg-emerald-500 animate-ping' : 'bg-zinc-400'}`}
            />
            <span>{isBangla ? (liveTrackingEnabled ? 'অটো ট্র্যাকিং' : 'ট্র্যাকিং অফ') : 'Auto Track'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))}
            className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Layers className="w-3 h-3 text-orange-500" />
            <span>{mapType === 'hybrid' ? (isBangla ? 'ম্যাপ' : 'Map') : isBangla ? 'স্যাটেলাইট' : 'Satellite'}</span>
          </button>

          <button
            type="button"
            onClick={() => setRecenterSignal((s) => s + 1)}
            className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer hover:border-orange-500"
            title={isBangla ? 'উভয় লোকেশন দেখুন' : 'Fit Route'}
          >
            <RefreshCw className="w-3 h-3 text-orange-500" />
            <span className="hidden sm:inline">{isBangla ? 'ফিট রুট' : 'Fit'}</span>
          </button>
        </div>
      </div>

      {/* Leaflet Route Map Viewport */}
      <div className="relative w-full" style={{ height }}>
        <div
          ref={mapContainerRef}
          className="w-full h-full bg-stone-200 dark:bg-zinc-950"
        />

        {/* Zoom Controls */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col bg-white/95 dark:bg-zinc-900/95 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-700">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-1.5 text-zinc-700 dark:text-zinc-200 hover:text-orange-500 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-1.5 text-zinc-700 dark:text-zinc-200 hover:text-orange-500 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Floating Map Legend */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-none flex flex-wrap items-center justify-between gap-2 z-10">
          <div className="pointer-events-auto inline-flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-zinc-950/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 shadow-lg text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>
                {viewerRole === 'customer'
                  ? isBangla
                    ? 'টেকনিশিয়ানের অবস্থান'
                    : 'Technician Location'
                  : isBangla
                    ? 'আপনার লোকেশন'
                    : 'Your Location'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-orange-500" />
              <span>
                {viewerRole === 'customer'
                  ? isBangla
                    ? 'আপনার ঠিকানা'
                    : 'Your Address'
                  : isBangla
                    ? 'গ্রাহকের লোকেশন'
                    : 'Customer Pin'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-600 inline-block" />
              <span className="text-amber-600 dark:text-amber-400">
                {isBangla ? 'সবচেয়ে কম দূরত্বের পথ' : 'Shortest Path'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Turn-by-Turn Route Directions & Customer Actions */}
      <div className="p-3.5 bg-stone-50/80 dark:bg-zinc-900/70 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowAllSteps((prev) => !prev)}
            className="text-xs font-black text-zinc-900 dark:text-white flex items-center gap-1.5 cursor-pointer hover:text-orange-600"
          >
            <RouteIcon className="w-4 h-4 text-amber-500" />
            <span>
              {isBangla ? 'কোন পথে যাবেন (রুট নির্দেশনা)' : 'Turn-by-Turn Directions'}
              {routeSummary ? ` (${toBengaliNumber(routeSummary.steps.length)} ধাপ)` : ''}
            </span>
            <span className="text-[10px] font-bold text-orange-600 dark:text-amber-400 ml-1">
              {showAllSteps ? (isBangla ? '▲ লুকান' : '▲ Hide') : isBangla ? '▼ দেখুন' : '▼ Show'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${viewerRole === 'customer' ? (booking.technicianPhone || technician.phone) : booking.customerPhone}`}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold flex items-center gap-1 hover:border-orange-500"
            >
              <Phone className="w-3 h-3 text-orange-500" />
              <span>
                {viewerRole === 'customer'
                  ? isBangla
                    ? 'মিস্ত্রিকে কল'
                    : 'Call Pro'
                  : isBangla
                    ? 'গ্রাহককে কল'
                    : 'Call'}
              </span>
            </a>
            <a
              href={externalDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-[11px] font-black flex items-center gap-1 shadow-sm"
            >
              <ExternalLink className="w-3 h-3" />
              <span>{isBangla ? 'Google Maps নেভিগেশন' : 'Open in Google Maps'}</span>
            </a>
          </div>
        </div>

        {showAllSteps && routeSummary && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {routeSummary.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-2.5 p-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-xs"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {isBangla ? toBengaliNumber(idx + 1) : idx + 1}
                  </span>
                  <div className="mt-0.5">{renderStepIcon(step.directionKey)}</div>
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium leading-snug">
                    {step.instruction}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-black text-orange-600 dark:text-amber-400">
                    {step.distanceText}
                  </div>
                  <div className="text-[10px] text-zinc-400">{step.durationText}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
