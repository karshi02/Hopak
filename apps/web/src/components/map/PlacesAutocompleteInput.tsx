'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { normalizeProvince } from '@hopak/shared';

export interface PlacePick {
  lat: number;
  lng: number;
  /** ที่อยู่เต็มจาก Google */
  address: string;
  /** ชื่อสถานที่ (ชื่อหอ/โรงแรม/คอนโด) */
  name: string;
  /** จังหวัดที่แมปกับรายชื่อในระบบแล้ว (null = จับคู่ไม่ได้ เช่นอยู่ต่างประเทศ) */
  province: string | null;
  /** ประเทศ (ISO code) เผื่อเช็คว่าอยู่ไทยไหม */
  country: string | null;
}

interface PlacesAutocompleteInputProps {
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  /**
   * ประเภทสถานที่ที่ยอมให้เลือก — default 'lodging' = โรงแรม/หอพัก/คอนโด/เกสต์เฮาส์เท่านั้น
   * กันคนกรอกมั่ว (ร้านอาหาร/ปั๊มน้ำมัน/พิกัดกลางทุ่ง)
   */
  types?: string[];
  /** จำกัดประเทศ — ใส่ undefined = ค้นได้ทั่วโลก */
  country?: string;
  onSelect: (pick: PlacePick) => void;
}

// ช่องค้นหาสถานที่แบบ Google Places Autocomplete — เลือกแล้วได้ lat/lng + ที่อยู่ + จังหวัดทันที
export default function PlacesAutocompleteInput({
  placeholder,
  className,
  defaultValue,
  types = ['lodging'],
  country,
  onSelect,
}: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    // Google เรียกฟังก์ชันนี้เมื่อ key ผิด/ยังไม่เปิด API/ไม่ได้เปิด billing — ปกติเห็นแค่ใน console
    // ดึงมาโชว์บนหน้าจอ ไม่งั้นผู้ใช้เจอแค่ "ค้นหาไม่ได้" แล้วไม่รู้สาเหตุ
    window.gm_authFailure = () => {
      if (!cancelled) setError('Google Maps ปฏิเสธคีย์ — ตรวจ API key / เปิด Places API / เปิด billing ใน Google Cloud');
    };

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !inputRef.current) return;
        if (!g.maps.places?.Autocomplete) {
          setError('ยังไม่ได้เปิด Places API สำหรับคีย์นี้ (Google Cloud → Enable "Places API")');
          return;
        }
        autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
          fields: ['geometry', 'formatted_address', 'name', 'address_components'],
          types,
          ...(country ? { componentRestrictions: { country } } : {}),
        });
        autocomplete.addListener('place_changed', async () => {
          const place = autocomplete!.getPlace();
          setError(null);

          const emit = (
            lat: number,
            lng: number,
            address: string,
            name: string,
            components: google.maps.GeocoderAddressComponent[],
          ) => {
            const provinceRaw = components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name;
            const countryCode = components.find((c) => c.types.includes('country'))?.short_name ?? null;
            // บางผลลัพธ์ไม่มี administrative_area_level_1 มาให้ — แกะจากที่อยู่เต็มแทน
            const province = normalizeProvince(provinceRaw) ?? normalizeProvince(address);
            onSelectRef.current({
              lat,
              lng,
              address,
              name,
              province,
              country: countryCode,
            });
          };

          const loc = place.geometry?.location;
          if (loc) {
            emit(loc.lat(), loc.lng(), place.formatted_address ?? '', place.name ?? '', place.address_components ?? []);
            return;
          }

          // ไม่มีพิกัดกลับมา = คำขอ Place Details ถูกปฏิเสธ (Places API ยังไม่เปิด/ไม่ได้ติ๊กในคีย์)
          // สำรอง: หาพิกัดจากข้อความที่ผู้ใช้เลือก ผ่าน Geocoding API แทน
          // ต้องใช้ "ข้อความเต็ม" ในช่อง (Google เติมให้เป็น "ชื่อ, ถนน, อำเภอ, จังหวัด") ไม่ใช่แค่ชื่อสถานที่
          // ถ้าส่งแค่ชื่อ Google จะเดาผิดเป็นกรุงเทพฯ เพราะไม่มีบริบทจังหวัด
          const full = (inputRef.current?.value ?? '').trim();
          const text = full.length >= (place.name ?? '').length ? full : (place.name ?? '').trim();
          if (!text) {
            setError('เลือกสถานที่ไม่สำเร็จ — ลองพิมพ์ใหม่อีกครั้ง');
            return;
          }
          try {
            const geocoder = new g.maps.Geocoder();
            // ข้อความไทย = จำกัดผลลัพธ์ไว้ในไทย กัน Google เดาไปประเทศอื่น/จังหวัดผิด
            const isThai = /[฀-๿]/.test(text);
            const res = await geocoder.geocode({
              address: text,
              ...(isThai ? { componentRestrictions: { country: 'TH' } } : {}),
            });
            const best = res.results?.[0];
            if (!best) {
              setError('หาพิกัดของสถานที่นี้ไม่เจอ — ลากหมุดบนแผนที่แทนได้');
              return;
            }
            emit(
              best.geometry.location.lat(),
              best.geometry.location.lng(),
              best.formatted_address ?? text,
              place.name || text,
              best.address_components ?? [],
            );
          } catch {
            setError('ดึงพิกัดไม่สำเร็จ — ตรวจว่าเปิด "Places API" และ "Geocoding API" ในคีย์แล้ว');
          }
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'โหลด Google Maps ไม่สำเร็จ');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <input ref={inputRef} type="text" defaultValue={defaultValue} placeholder={placeholder} className={className} />
      {error && <p className="mt-1.5 text-[12px] font-semibold text-danger">{error}</p>}
    </>
  );
}
