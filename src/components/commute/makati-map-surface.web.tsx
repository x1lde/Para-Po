import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { MAP_STYLE_URL } from '@/features/maps/services/map-scene';
import { makatiOverviewScene } from '@/features/maps/services/makati-overview';

const pins = makatiOverviewScene.markers;
// The worker is served from the site root (public/, copied on install). Without it, the map never loads.
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

/** Web: the same landmark pins on MapLibre GL JS (the native package doesn't run in browsers). */
export function MakatiMapSurface() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const lons = pins.map((pin) => pin.coordinate[0]);
    const lats = pins.map((pin) => pin.coordinate[1]);
    const map = new maplibregl.Map({
      container: element, style: MAP_STYLE_URL, attributionControl: { compact: true },
      bounds: [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      fitBoundsOptions: { padding: 48 },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.addSource('landmarks', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: pins.map((pin) => ({ type: 'Feature', properties: { name: pin.name }, geometry: { type: 'Point', coordinates: pin.coordinate } })) },
      });
      map.addLayer({ id: 'landmark-dots', type: 'circle', source: 'landmarks', paint: { 'circle-radius': 6, 'circle-color': '#FF6B35', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
      map.addLayer({ id: 'landmark-names', type: 'symbol', source: 'landmarks', layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top' },
        paint: { 'text-color': '#24343B', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } });
    });
    return () => map.remove();
  }, []);
  return <div ref={container} style={{ width: '100%', height: '100%' }} />;
}
