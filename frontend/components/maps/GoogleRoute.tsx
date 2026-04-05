"use client";

import { useMemo, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

function Polyline({ path }: { path: google.maps.LatLngLiteral[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || path.length === 0) return;
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#f97316',
      strokeOpacity: 1.0,
      strokeWeight: 4,
    });
    polyline.setMap(map);
    return () => polyline.setMap(null);
  }, [map, path]);
  return null;
}

export default function GoogleRoute({ items, selectedItemId }: { items: any[], selectedItemId: string | null }) {
  const coordinates = useMemo(() => {
    return items
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => ({ lat: i.latitude, lng: i.longitude }));
  }, [items]);

  const defaultCenter = useMemo(() => {
    if (coordinates.length === 0) return { lat: 0, lng: 0 };
    const lats = coordinates.map(c => c.lat);
    const lngs = coordinates.map(c => c.lng);
    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  }, [coordinates]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Google Maps API Key missing in .env</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
      <Map
        defaultZoom={12}
        defaultCenter={defaultCenter}
        mapId="DEMO_MAP_ID"
        disableDefaultUI={true}
        style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
      >
        <Polyline path={coordinates} />
        {items.map(item => {
          if (item.latitude === null || item.longitude === null) return null;
          const isSelected = item.id === selectedItemId;
          return (
            <AdvancedMarker key={item.id} position={{ lat: item.latitude, lng: item.longitude }}>
              <div className={`flex items-center justify-center p-1 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${isSelected ? 'scale-125 border-2 border-primary-500 z-10' : ''}`}>
                <MapPin className={isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'} size={isSelected ? 24 : 20} strokeWidth={isSelected ? 2.5 : 2} fill={isSelected ? '#fed7aa' : 'none'} />
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>
    </APIProvider>
  );
}
