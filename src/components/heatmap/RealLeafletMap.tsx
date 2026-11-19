import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DHAKA_HEATMAP_ZONES, HeatmapZone, TechnicianLocation } from '../../data/heatmapData';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Layers,
  Navigation,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Phone,
  MapPin,
  ArrowRight,
  Flame,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  isValidLatLng,
  safeFlyOrSetView,
  safeLatLngToContainerPoint,
  attachMapResizeObserver,
} from '../../utils/geoUtils';
import { createResilientTileLayer, MapTileStyle } from '../../utils/mapTiles';

type MapTileLayerType = MapTileStyle;

interface RealLeafletMapProps {
  zones?: HeatmapZone[];
  selectedZone: HeatmapZone;
  onSelectZone: (zone: HeatmapZone) => void;
  activeMode: 'DEMAND_INTENSITY' | 'PRO_DENSITY' | 'EMERGENCY_HOTSPOTS';
  userLocation?: { lat: number; lng: number } | null;
  flyToUserSeq?: number;
  searchedLocation?: { lat: number; lng: number; name: string; zoom?: number } | null;
  flyToSearchSeq?: number;
  className?: string;
}

export const RealLeafletMap: React.FC<RealLeafletMapProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  activeMode,
  userLocation = null,
  flyToUserSeq = 0,
  searchedLocation = null,
  flyToSearchSeq = 0,
  className = '',
}) => {
  const { theme } = useTheme();
  const { isBangla } = useLanguage();
  const { technicians } = useApp();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isDark = theme === 'dark';
  const activeZones = zones && zones.length > 0 ? zones : DHAKA_HEATMAP_ZONES;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedZoneRef = useRef(false);

  const [mapType, setMapType] = useState<MapTileLayerType>('THEMED');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [selectedTech, setSelectedTech] = useState<TechnicianLocation | null>(null);

  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [hoveredTechId, setHoveredTechId] = useState<string | null>(null);
  const [pinnedZoneId, setPinnedZoneId] = useState<string | null>(null);
  const [pinnedTechId, setPinnedTechId] = useState<string | null>(null);
  const [cardPoint, setCardPoint] = useState<{ x: number; y: number } | null>(null);

  const handleZoneMouseEnter = (zoneId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredZoneId(zoneId);
  };

  const handleZoneMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredZoneId(null), 280);
  };

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
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredZoneId(null);
      setHoveredTechId(null);
    }, 280);
  };

  const getZoneColors = (zone: HeatmapZone) => {
    if (activeMode === 'DEMAND_INTENSITY') {
      if (zone.demandScore >= 70) return { hex: '#ea580c', borderHex: '#f97316', textHex: '#ffffff' };
      if (zone.demandScore >= 35) return { hex: '#f97316', borderHex: '#fb923c', textHex: '#ffffff' };
      return { hex: '#f59e0b', borderHex: '#fbbf24', textHex: '#ffffff' };
    }
    if (activeMode === 'PRO_DENSITY') {
      if (zone.activeTechnicians >= 5) return { hex: '#10b981', borderHex: '#34d399', textHex: '#ffffff' };
      if (zone.activeTechnicians >= 1) return { hex: '#f97316', borderHex: '#fb923c', textHex: '#ffffff' };
      return { hex: '#6366f1', borderHex: '#818cf8', textHex: '#ffffff' };
    }
    if (zone.emergencyCallsToday >= 5) return { hex: '#e11d48', borderHex: '#f43f5e', textHex: '#ffffff' };
    if (zone.emergencyCallsToday >= 1) return { hex: '#f97316', borderHex: '#fb923c', textHex: '#ffffff' };
    return { hex: '#f59e0b', borderHex: '#fcd34d', textHex: '#ffffff' };
  };

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = isValidLatLng(selectedZone?.lat, selectedZone?.lng)
      ? selectedZone.lat
      : 23.7806;
    const initialLng = isValidLatLng(selectedZone?.lat, selectedZone?.lng)
      ? selectedZone.lng
      : 90.398;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: selectedZone ? 13 : 12,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    const overlayGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    overlayLayerRef.current = overlayGroup;

    map.on('click', () => {
      setPinnedZoneId(null);
      setPinnedTechId(null);
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

  // Update Tile Layer whenever mapType or theme changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layer = createResilientTileLayer(mapType, isDark).addTo(map);
    layer.bringToBack();
    tileLayerRef.current = layer;
  }, [mapType, isDark]);

  // Smooth pan when selectedZone changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedZone) return;
    if (!hasMountedZoneRef.current) {
      hasMountedZoneRef.current = true;
      return;
    }
    safeFlyOrSetView(map, selectedZone.lat, selectedZone.lng, 13, { duration: 0.65 });
  }, [selectedZone?.id]);

  // Fly smoothly to user's live GPS location when requested
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToUserSeq || !userLocation || !isValidLatLng(userLocation.lat, userLocation.lng)) {
      return;
    }
    safeFlyOrSetView(map, userLocation.lat, userLocation.lng, 15, { duration: 0.7 });
  }, [flyToUserSeq, userLocation?.lat, userLocation?.lng]);

  // Fly smoothly to searched location when requested
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !flyToSearchSeq || !searchedLocation || !isValidLatLng(searchedLocation.lat, searchedLocation.lng)) {
      return;
    }
    safeFlyOrSetView(map, searchedLocation.lat, searchedLocation.lng, searchedLocation.zoom || 14, { duration: 0.7 });
  }, [flyToSearchSeq, searchedLocation?.lat, searchedLocation?.lng]);

  // Render Leaflet Zone Circles, Zone Markers, Live Technician Markers & User GPS Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    const overlayGroup = overlayLayerRef.current;
    if (!map || !overlayGroup) return;

    overlayGroup.clearLayers();

    // 1. Zones
    activeZones.forEach((zone) => {
      if (!isValidLatLng(zone.lat, zone.lng)) return;
      const colors = getZoneColors(zone);
      const isSelected = selectedZone.id === zone.id;
      const isCardOpen = hoveredZoneId === zone.id || pinnedZoneId === zone.id;
      const labelText = isBangla
        ? zone.nameBn.split('(')[0].trim()
        : zone.nameEn.split('(')[0].trim();
      const scoreBadge =
        activeMode === 'DEMAND_INTENSITY'
          ? `${zone.demandScore}%`
          : activeMode === 'PRO_DENSITY'
          ? `${zone.activeTechnicians} pros`
          : `${zone.emergencyCallsToday} calls`;

      const circle = L.circle([zone.lat, zone.lng], {
        radius: isSelected || isCardOpen ? 1200 : 850,
        color: colors.borderHex,
        fillColor: colors.hex,
        fillOpacity: isSelected || isCardOpen ? 0.34 : 0.18,
        weight: isSelected || isCardOpen ? 2 : 1,
      });
      circle.addTo(overlayGroup);

      const badgeHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:pointer;user-select:none;">
          <div style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:900;background:${colors.hex};color:#ffffff;border:2px solid ${
            isSelected || isCardOpen ? '#f97316' : '#ffffff'
          };box-shadow:0 8px 20px rgba(0,0,0,0.35);white-space:nowrap;transform:${
            isSelected || isCardOpen ? 'scale(1.1)' : 'scale(1)'
          };transition:transform 0.2s;">
            <span style="width:6px;height:6px;border-radius:9999px;background:#ffffff;display:inline-block;"></span>
            <span>${labelText}</span>
            <span style="background:rgba(0,0,0,0.35);padding:1px 6px;border-radius:9999px;font-size:9px;font-family:monospace;">${scoreBadge}</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${colors.hex};"></div>
        </div>
      `;

      const marker = L.marker([zone.lat, zone.lng], {
        icon: L.divIcon({
          className: 'servexa-leaflet-zone-icon',
          html: badgeHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        zIndexOffset: isCardOpen ? 2000 : isSelected ? 1000 : 100,
      });

      marker.on('mouseover', () => handleZoneMouseEnter(zone.id));
      marker.on('mouseout', () => handleZoneMouseLeave());
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectZone(zone);
        setPinnedTechId(null);
        setPinnedZoneId((prev) => (prev === zone.id ? null : zone.id));
      });

      marker.addTo(overlayGroup);
    });

    // 2. Nearby Live Technicians for selectedZone
    if (selectedZone && selectedZone.nearbyTechs) {
      selectedZone.nearbyTechs.forEach((tech) => {
        if (!isValidLatLng(tech.lat, tech.lng)) return;
        const isAvail = tech.available;
        const isTechCardOpen = hoveredTechId === tech.id || pinnedTechId === tech.id;

        const techHtml = `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;transform:translate(-50%,-50%);cursor:pointer;">
            <div style="width:32px;height:32px;border-radius:9999px;background:${
              isAvail ? '#059669' : '#3f3f46'
            };border:2px solid #ffffff;box-shadow:0 6px 16px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#ffffff;transform:${
              isTechCardOpen ? 'scale(1.22)' : 'scale(1)'
            };transition:transform 0.2s;">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            ${
              isAvail
                ? '<span style="position:absolute;top:-2px;right:-2px;width:11px;height:11px;background:#f97316;border-radius:9999px;border:2px solid #ffffff;"></span>'
                : ''
            }
          </div>
        `;

        const techMarker = L.marker([tech.lat, tech.lng], {
          icon: L.divIcon({
            className: 'servexa-leaflet-tech-icon',
            html: techHtml,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          zIndexOffset: isTechCardOpen ? 3000 : 500,
        });

        techMarker.on('mouseover', () => handleTechMouseEnter(tech.id));
        techMarker.on('mouseout', () => handleTechMouseLeave());
        techMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedTech(tech);
          setPinnedZoneId(null);
          setPinnedTechId((prev) => (prev === tech.id ? null : tech.id));
        });

        techMarker.addTo(overlayGroup);
      });
    }

    // 3. User Live GPS Marker when located
    if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
      const userLabel = isBangla ? 'আপনার অবস্থান' : 'You are here';
      const userMarkerHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
          <div style="padding:3px 9px;border-radius:9999px;background:#2563eb;color:#ffffff;font-size:10px;font-weight:900;white-space:nowrap;border:2px solid #ffffff;box-shadow:0 6px 16px rgba(37,99,235,0.45);margin-bottom:4px;">
            ${userLabel}
          </div>
          <div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;inset:-6px;border-radius:9999px;background:rgba(37,99,235,0.3);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <span style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></span>
          </div>
        </div>
      `;

      L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: 'servexa-user-gps-icon',
          html: userMarkerHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        zIndexOffset: 4000,
      }).addTo(overlayGroup);
    }

    // 4. Searched Location Pin Marker
    if (searchedLocation && isValidLatLng(searchedLocation.lat, searchedLocation.lng)) {
      const safeName = searchedLocation.name
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const searchPinHtml = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
          <div style="margin-bottom:5px;padding:4px 11px;border-radius:9999px;background:#09090b;color:#ffffff;border:2px solid #f97316;font-size:11px;font-weight:900;white-space:nowrap;box-shadow:0 8px 22px rgba(0,0,0,0.5);">
            📍 ${safeName}
          </div>
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;width:46px;height:46px;border-radius:9999px;background:rgba(249,115,22,0.28);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <div style="position:relative;width:34px;height:34px;border-radius:9999px 9999px 9999px 4px;transform:rotate(-45deg);background:linear-gradient(135deg,#f97316,#dc2626);color:#ffffff;display:flex;align-items:center;justify-content:center;border:2.5px solid #ffffff;box-shadow:0 10px 24px rgba(234,88,12,0.55);">
              <span style="transform:rotate(45deg);width:9px;height:9px;border-radius:9999px;background:#ffffff;display:block;"></span>
            </div>
          </div>
        </div>
      `;

      L.marker([searchedLocation.lat, searchedLocation.lng], {
        icon: L.divIcon({
          className: 'servexa-heatmap-search-pin',
          html: searchPinHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        zIndexOffset: 4500,
      }).addTo(overlayGroup);
    }
  }, [activeZones, selectedZone, activeMode, isBangla, hoveredZoneId, pinnedZoneId, hoveredTechId, pinnedTechId, userLocation?.lat, userLocation?.lng, searchedLocation?.lat, searchedLocation?.lng, searchedLocation?.name]);

  const activeZoneCard = activeZones.find(
    (z) => z.id === (pinnedZoneId || hoveredZoneId)
  );
  const activeTechCard = selectedZone?.nearbyTechs?.find(
    (t) => t.id === (pinnedTechId || hoveredTechId)
  );

  // Sync React card coordinates with Leaflet viewport on move/zoom
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const updatePoint = () => {
      if (activeTechCard) {
        setCardPoint(safeLatLngToContainerPoint(map, activeTechCard.lat, activeTechCard.lng));
      } else if (activeZoneCard) {
        setCardPoint(safeLatLngToContainerPoint(map, activeZoneCard.lat, activeZoneCard.lng));
      } else {
        setCardPoint(null);
      }
    };

    updatePoint();
    map.on('move zoom viewreset resize', updatePoint);
    return () => {
      map.off('move zoom viewreset resize', updatePoint);
    };
  }, [activeTechCard?.id, activeZoneCard?.id]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () =>
    safeFlyOrSetView(mapInstanceRef.current, 23.7806, 90.398, 12, { duration: 0.6 });

  const containerWidth = mapContainerRef.current?.clientWidth || 720;
  const clampedX = cardPoint
    ? Math.max(165, Math.min(containerWidth - 165, cardPoint.x))
    : 0;

  return (
    <div
      className={`relative w-full h-[460px] sm:h-[520px] lg:h-[580px] rounded-2xl overflow-hidden border border-orange-500/20 shadow-inner select-none ${className}`}
    >
      {/* Leaflet Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full absolute inset-0 z-0 bg-stone-200 dark:bg-zinc-950"
      />

      {/* Interactive Zone Hover/Pinned Card */}
      {activeZoneCard && !activeTechCard && cardPoint && (() => {
        const featuredPro = activeZoneCard.featuredPros && activeZoneCard.featuredPros[0];
        const matchedZoneTech = featuredPro
          ? technicians.find((t) => t.id === featuredPro.id || t.name === featuredPro.name)
          : null;
        const zoneProfileId = matchedZoneTech?.id || null;

        return (
          <div
            style={{
              left: `${clampedX}px`,
              top: `${Math.max(220, cardPoint.y - 36)}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="absolute z-30 pointer-events-auto w-[290px] sm:w-[320px] rounded-2xl bg-white/98 dark:bg-zinc-900/98 backdrop-blur-md border border-orange-500/40 shadow-2xl p-4 text-left font-sans animate-in fade-in zoom-in-95 duration-150"
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            onClick={(e) => e.stopPropagation()}
          >
            {pinnedZoneId === activeZoneCard.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedZoneId(null);
                  setHoveredZoneId(null);
                }}
                type="button"
                className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                title="Close"
              >
                ✕
              </button>
            )}

            <div className="flex items-center justify-between gap-1.5 mb-2 pr-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[11px] font-black truncate">
                <Flame className="w-3.5 h-3.5 fill-current shrink-0" />
                <span className="truncate">
                  {isBangla ? activeZoneCard.topCategoryBn : activeZoneCard.topCategory}
                </span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-extrabold shrink-0 border border-orange-500/30">
                {activeZoneCard.surgeMultiplier}x {isBangla ? 'সার্জ' : 'Surge'}
              </span>
            </div>

            <h4 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>{isBangla ? activeZoneCard.nameBn : activeZoneCard.nameEn}</span>
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
              {isBangla ? activeZoneCard.shortDescBn : activeZoneCard.shortDescEn}
            </p>

            <div className="grid grid-cols-3 gap-1.5 mt-3 py-1.5 px-2 bg-stone-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-center text-[10px]">
              <div>
                <div className="font-extrabold text-orange-600 dark:text-orange-400">
                  {activeZoneCard.demandScore}%
                </div>
                <div className="text-[8px] text-zinc-400">{isBangla ? 'ডিমান্ড স্কোর' : 'Demand'}</div>
              </div>
              <div className="border-x border-zinc-200 dark:border-zinc-700 px-1">
                <div className="font-bold text-zinc-700 dark:text-zinc-200">
                  {activeZoneCard.activeTechnicians} {isBangla ? 'জন' : 'pros'}
                </div>
                <div className="text-[8px] text-zinc-400">{isBangla ? 'প্রস্তুত মিস্ত্রি' : 'Ready'}</div>
              </div>
              <div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  {activeZoneCard.avgArrivalMinutes > 0 ? `~${activeZoneCard.avgArrivalMinutes}m` : '—'}
                </div>
                <div className="text-[8px] text-zinc-400">{isBangla ? 'আগমন সময়' : 'Avg ETA'}</div>
              </div>
            </div>

            {featuredPro && (
              <div className="mt-2.5 p-2 rounded-xl bg-orange-500/10 dark:bg-orange-950/30 border border-orange-500/20 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-[11px] truncate flex items-center gap-1">
                    <span>{featuredPro.name}</span>
                    <ShieldCheck className="w-3 h-3 text-blue-500 shrink-0" />
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {isBangla ? featuredPro.tradeBn : featuredPro.tradeEn}
                  </div>
                </div>
                <div className="text-amber-500 font-extrabold text-[11px] shrink-0">
                  ★ {featuredPro.rating || '5.0'}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAuthenticated) {
                    navigate('/login');
                    return;
                  }
                  if (zoneProfileId) {
                    navigate(`/professionals/${zoneProfileId}`);
                  } else {
                    navigate(
                      `/professionals?area=${encodeURIComponent(
                        activeZoneCard.nameEn.split('(')[0].trim()
                      )}`
                    );
                  }
                }}
                type="button"
                className="w-full py-2 px-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {!isAuthenticated && <Lock className="w-3 h-3 text-orange-500" />}
                <span>{isBangla ? 'প্রোফাইল দেখুন' : 'View Profile'}</span>
                <ArrowRight className="w-3 h-3 text-orange-500" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(
                    isAuthenticated
                      ? `/book?zone=${activeZoneCard.id}&service=${encodeURIComponent(
                          activeZoneCard.topCategory
                        )}`
                      : '/login'
                  );
                }}
                type="button"
                className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md shadow-orange-600/25 transition-all cursor-pointer active:scale-95"
              >
                <span>{isBangla ? 'সার্ভিস বুক করুন' : 'Book Service'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Interactive Technician Marker Hover/Pinned Card */}
      {activeTechCard && cardPoint && (() => {
        const matchedTech = technicians.find(
          (t) =>
            t.id === activeTechCard.id ||
            t.name.toLowerCase() === activeTechCard.name.toLowerCase()
        );
        const techProfileId = matchedTech?.id || activeTechCard.id;

        return (
          <div
            style={{
              left: `${clampedX}px`,
              top: `${Math.max(195, cardPoint.y - 24)}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="absolute z-30 pointer-events-auto w-[280px] sm:w-[300px] rounded-2xl bg-white/98 dark:bg-zinc-900/98 backdrop-blur-md border border-orange-500/40 shadow-2xl p-4 text-left font-sans animate-in fade-in zoom-in-95 duration-150"
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            onClick={(e) => e.stopPropagation()}
          >
            {pinnedTechId === activeTechCard.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedTechId(null);
                  setHoveredTechId(null);
                }}
                type="button"
                className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                title="Close"
              >
                ✕
              </button>
            )}

            <div className="flex items-center justify-between gap-1.5 mb-2 pr-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[10px] font-black truncate">
                {isBangla ? activeTechCard.tradeBn : activeTechCard.tradeEn}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isBangla ? 'এখনই প্রস্তুত' : 'Ready'}</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center shadow-md">
                {activeTechCard.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1 truncate">
                  <span className="truncate">{activeTechCard.name}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                </h5>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                  <span className="text-amber-500 font-bold flex items-center gap-0.5">
                    ★ {activeTechCard.rating || '5.0'}
                  </span>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    ~{activeTechCard.etaMins} {isBangla ? 'মিনিট' : 'mins'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(isAuthenticated ? `/professionals/${techProfileId}` : '/login');
                }}
                type="button"
                className="w-full py-2 px-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {!isAuthenticated && <Lock className="w-3 h-3 text-orange-500" />}
                <span>{isBangla ? 'প্রোফাইল দেখুন' : 'View Profile'}</span>
                <ArrowRight className="w-3 h-3 text-orange-500" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(
                    isAuthenticated
                      ? `/book?techId=${encodeURIComponent(techProfileId)}&zone=${selectedZone.id}`
                      : '/login'
                  );
                }}
                type="button"
                className="w-full py-2 px-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md shadow-orange-600/25 transition-all cursor-pointer active:scale-95"
              >
                <span>{isBangla ? 'বুক করুন' : 'Book Now'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Real-time Status Overlay Badge (Top Left) */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex items-center gap-2 pointer-events-auto text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
          </span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {isBangla ? 'লাইভ জিপিএস হিটম্যাপ' : 'Live GPS Heatmap'}
          </span>
          <span className="text-zinc-400">·</span>
          <span className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold">
            {isBangla ? `${activeZones.length}টি হটস্পট জোন` : `${activeZones.length} Hotspot Zones`}
          </span>
        </div>
      </div>

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            type="button"
            title={isBangla ? 'ম্যাপ লেয়ার পরিবর্তন' : 'Switch Map Layer'}
            className="p-2.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 border border-zinc-200 dark:border-zinc-800 shadow-xl transition-all cursor-pointer active:scale-95"
          >
            <Layers className="w-4 h-4" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl py-1.5 z-20 text-xs animate-in fade-in">
              <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                {isBangla ? 'ম্যাপ স্টাইল' : 'Map Tiles'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMapType('THEMED');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                  mapType === 'THEMED' ? 'font-bold text-orange-600 dark:text-orange-400' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span>🗺️ {isDark ? 'ডার্ক ম্যাটার' : 'লাইট রোডম্যাপ'}</span>
                {mapType === 'THEMED' && <span>✓</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapType('SATELLITE');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                  mapType === 'SATELLITE' ? 'font-bold text-orange-600 dark:text-orange-400' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span>🛰️ স্যাটেলাইট ইমেজারি</span>
                {mapType === 'SATELLITE' && <span>✓</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapType('TERRAIN');
                  setShowLayerMenu(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                  mapType === 'TERRAIN' ? 'font-bold text-orange-600 dark:text-orange-400' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span>⛰️ ওপেনস্ট্রিট ম্যাপ</span>
                {mapType === 'TERRAIN' && <span>✓</span>}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col bg-white/95 dark:bg-zinc-900/95 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          <button
            onClick={handleZoomIn}
            type="button"
            className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            type="button"
            className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRecenter}
            type="button"
            className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isBangla ? 'ঢাকা মেট্রো সেন্টারে ফিরুন' : 'Recenter Dhaka'}
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Technician Quick Card when a tech marker is clicked */}
      {selectedTech && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-20 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-md p-4 rounded-2xl border border-orange-500/30 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center shadow-md">
                {selectedTech.name.charAt(0)}
              </div>
              <div>
                <h5 className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span>{selectedTech.name}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                </h5>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {isBangla ? selectedTech.tradeBn : selectedTech.tradeEn}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTech(null)}
              type="button"
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-2 border-y border-zinc-100 dark:border-zinc-800 my-2">
            <span className="text-amber-500 font-bold flex items-center gap-1">
              ★ {selectedTech.rating || '5.0'} / 5.0
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              ⚡ ~{selectedTech.etaMins} {isBangla ? 'মিনিটে আগমন' : 'mins ETA'}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() =>
                navigate(
                  isAuthenticated
                    ? `/book?techId=${encodeURIComponent(selectedTech.id)}&zone=${selectedZone.id}`
                    : '/login'
                )
              }
              type="button"
              className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors shadow-md shadow-orange-600/20 text-center cursor-pointer"
            >
              {isAuthenticated
                ? isBangla
                  ? 'এখনই বুক করুন'
                  : 'Book Instantly'
                : isBangla
                ? 'বুক করতে লগইন করুন'
                : 'Sign In to Book'}
            </button>
            {isAuthenticated && selectedTech.phone ? (
              <a
                href={`tel:${selectedTech.phone}`}
                className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                title={isBangla ? 'নম্বর দেখতে লগইন করুন' : 'Sign in to call'}
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Map Footnote */}
      <div className="absolute bottom-2 left-3 z-10 hidden sm:flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 pointer-events-none">
        <span>
          📍{' '}
          {isBangla
            ? 'জোনে ক্লিক করে জুম করুন ও লাইভ টেকনিশিয়ান দেখুন'
            : 'Click any zone to zoom in & view live dispatchers'}
        </span>
      </div>
    </div>
  );
};
