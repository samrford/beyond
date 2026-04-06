"use client";

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
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
  className: 'custom-icon bg-transparent border-none',
  html: `<div class="flex items-center justify-center p-1 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${isSelected ? 'scale-125 border-2 border-[#f97316] z-10' : ''}" style="width: 32px; height: 32px; color: ${isSelected ? '#ea580c' : '#6b7280'}">
           <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? '24' : '20'}" height="${isSelected ? '24' : '20'}" viewBox="0 0 24 24" fill="${isSelected ? '#fed7aa' : 'none'}" stroke="currentColor" stroke-width="${isSelected ? '2.5' : '2'}" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

// Arrow icon for direction
const createArrowIcon = (rotation: number) => L.divIcon({
  className: 'arrow-icon bg-transparent border-none',
  html: `<div style="transform: rotate(${rotation}deg) translateX(12px); color: #f97316;">
           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="black" stroke-width="2.5" stroke-linejoin="round"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
         </div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
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

function MapClickHandler({ isSelectingLocation, onMapClick }: { isSelectingLocation: boolean, onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (isSelectingLocation && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function RouteArrows({ coordinates }: { coordinates: [number, number][] }) {
  if (coordinates.length < 2) return null;

  const arrows = [];
  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];

    const mid: [number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2
    ];

    const dy = end[0] - start[0]; // Lat diff
    const dx = end[1] - start[1]; // Lng diff
    const angle = Math.atan2(dx, dy) * (180 / Math.PI);

    arrows.push({
      position: mid,
      rotation: angle,
      id: `arrow-${i}`
    });
  }

  return (
    <>
      {arrows.map(arrow => (
        <Marker
          key={arrow.id}
          position={arrow.position}
          icon={createArrowIcon(arrow.rotation)}
          interactive={false}
          zIndexOffset={-50}
        />
      ))}
    </>
  );
}

export default function OSMRoute({
  items,
  selectedItemId,
  onMapClick,
  onItemSelect,
  isSelectingLocation = false
}: {
  items: any[],
  selectedItemId: string | null,
  onMapClick?: (lat: number, lng: number) => void,
  onItemSelect?: (id: string) => void,
  isSelectingLocation?: boolean
}) {
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
      <MapClickHandler isSelectingLocation={isSelectingLocation} onMapClick={onMapClick} />
      {coordinates.length > 1 && (
        <>
          {/* Base solid black line for outline effect */}
          <Polyline
            positions={coordinates}
            pathOptions={{
              color: 'black',
              weight: 5,
              opacity: 0.6
            }}
          />
          {/* Top orange dashed line */}
          <Polyline
            positions={coordinates}
            pathOptions={{
              color: '#f97316',
              weight: 3,
              dashArray: '8, 12',
              lineCap: 'round',
              opacity: 1
            }}
          />
          <RouteArrows coordinates={coordinates} />
        </>
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
            eventHandlers={{
              click: () => onItemSelect?.(item.id)
            }}
          />
        );
      })}
    </MapContainer>
  );
}
