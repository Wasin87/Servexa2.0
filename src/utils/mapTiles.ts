import L from 'leaflet';

export type MapTileStyle = 'THEMED' | 'SATELLITE' | 'TERRAIN';

export interface TileStyleConfig {
  url: string;
  fallbackUrl: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string | string[];
}

/**
 * 100% Keyless public tile layer presets using pure OpenStreetMap and Esri World Imagery.
 * Zero API keys, zero watermarks, zero billing requirements.
 */
export function getMapTileConfig(style: MapTileStyle, isDark: boolean): TileStyleConfig {
  if (style === 'SATELLITE') {
    return {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; Esri World Imagery',
      maxZoom: 19
    };
  }

  if (style === 'TERRAIN') {
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    };
  }

  // Pure OpenStreetMap tiles (100% free, keyless, zero watermarks)
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c']
  };
}

/**
 * Creates a resilient Leaflet TileLayer that automatically switches to an OpenStreetMap fallback
 * if multiple consecutive tile errors occur.
 */
export function createResilientTileLayer(style: MapTileStyle, isDark: boolean): L.TileLayer {
  const cfg = getMapTileConfig(style, isDark);
  const layer = L.tileLayer(cfg.url, {
    attribution: cfg.attribution,
    maxZoom: cfg.maxZoom,
    ...(cfg.subdomains ? { subdomains: cfg.subdomains } : {})
  });

  let errorCount = 0;
  let switchedToFallback = false;

  layer.on('tileerror', () => {
    errorCount += 1;
    if (!switchedToFallback && errorCount >= 3) {
      switchedToFallback = true;
      layer.setUrl(cfg.fallbackUrl);
    }
  });

  return layer;
}
