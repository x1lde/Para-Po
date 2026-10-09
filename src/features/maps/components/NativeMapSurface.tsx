import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getMapViewport, MAP_STYLE_URL } from '../services/map-scene';
import type { TransportMapProps } from '../types';
import { MapStatus } from './MapStatus';
import { accuracyCircle } from '../services/accuracy-circle';

export default function NativeMapSurface({ scene, onRetry, focusRequest = 0, focusMode = 'journey', onMarkerPress, selectedMarkerId, selectedRouteId }: TransportMapProps & { onRetry: () => void }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const camera = useRef<CameraRef>(null);
  useEffect(() => {
    if (status !== 'ready') return;
    const user = scene.markers.find((marker) => marker.kind === 'user');
    const view = focusMode === 'user' && user ? { center: user.coordinate, zoom: 15 } : getMapViewport(scene, false);
    if ('bounds' in view) camera.current?.fitBounds(view.bounds, { padding: view.padding, duration: 500 });
    else camera.current?.flyTo({ ...view, duration: 500 });
  }, [focusRequest, focusMode, scene, status]);
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('failed'), 20000);
    return () => clearTimeout(timer);
  }, [status]);
  const points: FeatureCollection<Point> = {
    type: 'FeatureCollection', features: scene.markers.map((marker) => ({
      type: 'Feature', id: marker.id, properties: { markerId: marker.id, name: marker.name, kind: marker.kind, selected: marker.id === selectedMarkerId },
      geometry: { type: 'Point', coordinates: marker.coordinate },
    })),
  };
  const lines: FeatureCollection<LineString> = {
    type: 'FeatureCollection', features: scene.routes.map((route) => ({
      type: 'Feature', id: route.routeId, properties: { source: route.sourceReference, selected: route.routeId === selectedRouteId },
      geometry: { type: 'LineString', coordinates: route.coordinates },
    })),
  };
  const uncertainty = accuracyCircle(scene.markers.find((marker) => marker.kind === 'user'));
  if (status === 'failed') return <MapStatus message="The online map could not load." onRetry={onRetry} />;
  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MAP_STYLE_URL} attribution
        onDidFinishLoadingMap={() => setStatus('ready')}
        onDidFailLoadingMap={() => setStatus('failed')}>
        <Camera ref={camera} initialViewState={getMapViewport(scene)} />
        {uncertainty && <GeoJSONSource id="gps-accuracy" data={uncertainty}>
          <Layer id="gps-accuracy-fill" type="fill" paint={{ 'fill-color': '#7856c4', 'fill-opacity': 0.16 }} />
          <Layer id="gps-accuracy-edge" type="line" paint={{ 'line-color': '#7856c4', 'line-width': 1 }} />
        </GeoJSONSource>}
        {lines.features.length > 0 && <GeoJSONSource id="transport-paths" data={lines}>
          <Layer id="transport-lines" type="line" paint={{ 'line-color': ['case', ['get', 'selected'], '#e58a00', '#208AEF'], 'line-width': ['case', ['get', 'selected'], 6, 4] }} />
        </GeoJSONSource>}
        {points.features.length > 0 && <GeoJSONSource id="transport-points" data={points} onPress={(event) => {
          const feature = event.nativeEvent.features[0];
          const id = typeof feature?.id === 'string' ? feature.id : feature?.properties?.markerId;
          const marker = typeof id === 'string' ? scene.markers.find((item) => item.id === id) : undefined;
          if (marker) onMarkerPress?.(marker);
        }}>
          <Layer id="transport-markers" type="circle" paint={{
            'circle-radius': ['case', ['get', 'selected'], 11, 7], 'circle-stroke-width': ['case', ['get', 'selected'], 4, 2], 'circle-stroke-color': ['case', ['get', 'selected'], '#e58a00', '#ffffff'],
            'circle-color': ['match', ['get', 'kind'], 'boarding', '#208AEF', 'destination', '#d33d46', 'user', '#7856c4', '#32854b'],
          }} />
          <Layer id="transport-labels" type="symbol" layout={{
            'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.5], 'text-anchor': 'top',
          }} paint={{ 'text-color': '#222222', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }} />
        </GeoJSONSource>}
      </Map>
      {status === 'loading' && <View style={styles.loading} pointerEvents="none">
        <MapStatus message="Loading online map…" loading />
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, map: { flex: 1 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
