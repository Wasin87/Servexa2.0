import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, LocateFixed, MapPin, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  DHAKA_CENTER,
  attachMapResizeObserver,
  isValidLatLng,
  safeFlyOrSetView
} from '../../utils/geoUtils';
import { createResilientTileLayer, MapTileStyle } from '../../utils/mapTiles';

export interface ServiceLocationPickerMapProps {
  lat: number;
  lng: number;
  label?: string;
  sublabel?: string;
  interactive?: boolean;
  coverageRadiusMeters?: number;
  height?: string;
  onChangeLocation?: (coords: { lat: number; lng: number }) => void;
  onRequestGps?: () => void;
  isDetectingGps?: boolean;
  className?: string;
}

export const ServiceLocationPickerMap: React.FC<ServiceLocationPickerMapProps> = ({
  lat,
  lng,
  label,
  sublabel,
  interactive = true,
  coverageRadiusMeters = 0,
  height = '240px',
  onChangeLocation,
  onRequestGps,
  isDetectingGps = false,
  className = ''
}) => {
  const { theme } = useTheme();
  const { isBangla } = useLanguage();
  const isDark = theme === 'dark';

  const safeLat = isValidLatLng(lat, lng) ? lat : DHAKA_CENTER.lat;
  const safeLng = isValidLatLng(lat, lng) ? lng : DHAKA_CENTER.lng;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const hasMountedRef = useRef(false);
  const onChangeRef = useRef(onChangeLocation);
  onChangeRef.current = onChangeLocation;

  const [tileStyle, setTileStyle] = useState<MapTileStyle>('THEMED');

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [safeLat, safeLng],
      zoom: coverageRadiusMeters > 0 ? 13 : 15,
      minZoom: 7,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false
    });

    const overlayGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    overlayGroupRef.current = overlayGroup;

    if (interactive) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = Number(e.latlng.lat.toFixed(6));
        const clickedLng = Number(e.latlng.lng.toFixed(6));
        if (isValidLatLng(clickedLat, clickedLng)) {
          onChangeRef.current?.({ lat: clickedLat, lng: clickedLng });
        }
      });
    }

    const detachResize = attachMapResizeObserver(mapContainerRef.current, map);

    return () => {
      detachResize();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      overlayGroupRef.current = null;
    };
  }, [interactive]);

  // Sync tile style & theme
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layer = createResilientTileLayer(tileStyle, isDark).addTo(map);
    layer.bringToBack();
    tileLayerRef.current = layer;
  }, [tileStyle, isDark]);

  // Sync marker, coverage radius & camera when coordinates update
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = overlayGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (coverageRadiusMeters > 0) {
      L.circle([safeLat, safeLng], {
        radius: coverageRadiusMeters,
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.14,
        weight: 2,
        dashArray: '6 6'
      }).addTo(group);
    }

    const safeLabelText = (label || (isBangla ? 'নির্বাচিত অবস্থান' : 'Pinned Location'))
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const pinHtml = `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);user-select:none;">
        <div style="margin-bottom:4px;padding:3px 10px;border-radius:9999px;background:#09090b;color:#ffffff;border:2px solid #f97316;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 8px 18px rgba(0,0,0,0.4);">
          📍 ${safeLabelText}
        </div>
        <div style="width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 8px 18px rgba(234,88,12,0.45);">
          📌
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #ea580c;margin-top:-1px;"></div>
      </div>
    `;

    const marker = L.marker([safeLat, safeLng], {
      draggable: interactive,
      icon: L.divIcon({
        className: 'servexa-picker-pin-icon',
        html: pinHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      }),
      zIndexOffset: 1000
    });

    if (interactive) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const nextLat = Number(pos.lat.toFixed(6));
        const nextLng = Number(pos.lng.toFixed(6));
        if (isValidLatLng(nextLat, nextLng)) {
          onChangeRef.current?.({ lat: nextLat, lng: nextLng });
        }
      });
    }

    marker.addTo(group);

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      safeFlyOrSetView(map, safeLat, safeLng, coverageRadiusMeters > 0 ? 13 : 15, { animate: false });
    } else {
      safeFlyOrSetView(map, safeLat, safeLng, Math.max(map.getZoom(), coverageRadiusMeters > 0 ? 13 : 15), {
        duration: 0.55
      });
    }
  }, [safeLat, safeLng, label, coverageRadiusMeters, interactive, isBangla]);

  const cycleTileStyle = () => {
    setTileStyle((prev) =>
      prev === 'THEMED' ? 'SATELLITE' : prev === 'SATELLITE' ? 'TERRAIN' : 'THEMED'
    );
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-stone-200 dark:bg-zinc-950 ${className}`}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

      {/* Top Left Label Badge */}
      <div className="absolute top-2.5 left-2.5 z-10 max-w-[70%] pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 shadow-md text-[11px] font-bold text-zinc-800 dark:text-zinc-100">
          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="truncate">
            {sublabel ||
              (interactive
                ? isBangla
                  ? 'ম্যাপে ক্লিক বা পিন ড্র্যাগ করে ঠিকানা নির্ধারণ করুন'
                  : 'Click map or drag pin to adjust location'
                : isBangla
                  ? 'সার্ভিস কভারেজ এলাকা'
                  : 'Service Coverage Zone')}
          </span>
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
        {onRequestGps && (
          <button
            type="button"
            onClick={onRequestGps}
            disabled={isDetectingGps}
            title={isBangla ? 'বর্তমান GPS লোকেশনে যান' : 'Center on My GPS'}
            className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold shadow-md flex items-center gap-1 cursor-pointer disabled:opacity-60"
          >
            <LocateFixed className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isBangla ? 'আমার GPS' : 'My GPS'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={cycleTileStyle}
          title={isBangla ? 'ম্যাপ স্টাইল পরিবর্তন' : 'Switch Map Style'}
          className="p-1.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-orange-500 shadow-md cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center bg-white/95 dark:bg-zinc-900/95 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-md overflow-hidden divide-x divide-zinc-200 dark:divide-zinc-700">
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
      </div>

      {/* Bottom Right Coordinate Pill */}
      <div className="absolute bottom-2 right-2.5 z-10 pointer-events-none px-2 py-0.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-700/80 text-[10px] font-mono text-zinc-600 dark:text-zinc-300 shadow-xs">
        {safeLat.toFixed(4)}, {safeLng.toFixed(4)}
      </div>
    </div>
  );
};
