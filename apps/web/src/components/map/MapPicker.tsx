'use client';

import { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

export default function MapPicker({ lat, lng, onChange, readOnly }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps().then((g) => {
      if (cancelled || !containerRef.current) return;

      const map = new g.maps.Map(containerRef.current, {
        center: { lat, lng },
        zoom: 15,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      const marker = new g.maps.Marker({
        position: { lat, lng },
        map,
        draggable: !readOnly,
      });
      markerRef.current = marker;

      if (!readOnly) {
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) onChangeRef.current?.(pos.lat(), pos.lng());
        });
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          onChangeRef.current?.(e.latLng.lat(), e.latLng.lng());
        });
      }
    });

    return () => {
      cancelled = true;
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markerRef.current?.setPosition({ lat, lng });
    mapRef.current?.panTo({ lat, lng });
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
    />
  );
}
