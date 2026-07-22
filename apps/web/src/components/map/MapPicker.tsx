'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = new L.Icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

export default function MapPicker({ lat, lng, onChange, readOnly }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Next.js App Router can resume a hidden/cached page tree without an
    // unmount in between, leaving the previous Leaflet instance's flag on
    // this DOM node — clear it so re-init on the same node doesn't throw.
    if ((container as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (container as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const map = L.map(container, { attributionControl: true }).setView([lat, lng], 14);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([lat, lng], { icon: markerIcon, draggable: !readOnly }).addTo(map);
    markerRef.current = marker;

    if (!readOnly && onChangeRef.current) {
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeRef.current?.(pos.lat, pos.lng);
      });
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current?.(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markerRef.current?.setLatLng([lat, lng]);
    mapRef.current?.panTo([lat, lng]);
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
    />
  );
}
