"use client";

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leafet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create custom div icon using app styling
const createIcon = (isSelected: boolean) => L.divIcon({
  className: 'custom-icon bg-transparent border-none', // Leaflet adds a default white bg sometimes if not overridden
  html: `<div class="flex items-center justify-center p-1 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${isSelected ? 'scale-125 border-2 border-[#f97316] z-10' : ''}" style="width: 32px; height: 32px; color: ${isSelected ? '#ea580c' : '#6b7280'}">
           <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? '24' : '20'}" height="${isSelected ? '24' : '20'}" viewBox="0 0 24 24" fill="${isSelected ? '#fed7aa' : 'none'}" stroke="currentColor" stroke-width="${isSelected ? '2.5' : '2'}" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

function BoundsFitter({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, { padding: [50, 50] });
    }
  }, [map, coordinates]);
  return null;
}

export default function OSMRoute({ items, selectedItemId }: { items: any[], selectedItemId: string | null }) {
  const coordinates = useMemo(() => {
    return items
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => [i.latitude, i.longitude] as [number, number]);
  }, [items]);

  const center = coordinates.length > 0 ? coordinates[0] : [0, 0] as [number, number];

  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {coordinates.length > 1 && (
        <Polyline positions={coordinates} pathOptions={{ color: '#f97316', weight: 4 }} />
      )}
      <BoundsFitter coordinates={coordinates} />
      {items.map(item => {
        if (item.latitude === null || item.longitude === null) return null;
        const isSelected = item.id === selectedItemId;
        return (
          <Marker 
            key={item.id} 
            position={[item.latitude, item.longitude]}
            icon={createIcon(isSelected)}
          />
        );
      })}
    </MapContainer>
  );
}
