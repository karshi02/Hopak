'use client';

import { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';

interface PlacesAutocompleteInputProps {
  placeholder?: string;
  className?: string;
  onSelect: (lat: number, lng: number, address: string, name: string) => void;
}

// ช่องค้นหาสถานที่แบบ Google Places Autocomplete — เลือกรายการแล้วได้ lat/lng + ที่อยู่เต็มทันที
export default function PlacesAutocompleteInput({ placeholder, className, onSelect }: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps().then((g) => {
      if (cancelled || !inputRef.current) return;
      autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
        fields: ['geometry', 'formatted_address', 'name'],
        componentRestrictions: { country: 'th' },
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete!.getPlace();
        const loc = place.geometry?.location;
        if (!loc) return;
        onSelectRef.current(loc.lat(), loc.lng(), place.formatted_address ?? '', place.name ?? '');
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <input ref={inputRef} type="text" placeholder={placeholder} className={className} />;
}
