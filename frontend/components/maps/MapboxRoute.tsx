"use client";

import { useMemo } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

export default function MapboxRoute({ items, selectedItemId }: { items: any[], selectedItemId: string | null }) {
  const coordinates = useMemo(() => {
    return items
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => [i.longitude, i.latitude]);
  }, [items]);

  const geojson = useMemo(() => {
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: coordinates,
      },
    };
  }, [coordinates]);

  const initialViewState = useMemo(() => {
    if (coordinates.length === 0) return { longitude: 0, latitude: 0, zoom: 2 };
    const lngs = coordinates.map(c => c[0]);
    const lats = coordinates.map(c => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    return {
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom: 12
    };
  }, [coordinates]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Mapbox Access Token is missing in .env</p>
      </div>
    );
  }

  return (
    <Map
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
      initialViewState={initialViewState}
      style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      {coordinates.length > 1 && (
        <Source id="route" type="geojson" data={geojson}>
          <Layer
            id="route"
            type="line"
            source="route"
            layout={{
              'line-join': 'round',
              'line-cap': 'round'
            }}
            paint={{
              'line-color': '#f97316',
              'line-width': 4
            }}
          />
        </Source>
      )}

      {items.map((item) => {
        if (item.latitude === null || item.longitude === null) return null;
        const isSelected = item.id === selectedItemId;
        return (
          <Marker
            key={item.id}
            longitude={item.longitude}
            latitude={item.latitude}
            anchor="bottom"
          >
            <div className={`flex items-center justify-center p-1 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${isSelected ? 'scale-125 border-2 border-primary-500 z-10' : ''}`}>
              <MapPin className={isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'} size={isSelected ? 24 : 20} strokeWidth={isSelected ? 2.5 : 2} fill={isSelected ? '#fed7aa' : 'none'} />
            </div>
          </Marker>
        );
      })}
    </Map>
  );
}
