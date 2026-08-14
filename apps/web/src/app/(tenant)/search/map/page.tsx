'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { addressInDistrict } from '@hopak/shared';
import { useDormSearch } from '@/hooks/useDormSearch';
import { useLang } from '@/hooks/useLang';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { PageLoader } from '@/components/PageLoader';

/**
 * ค้นหาหอพักบนแผนที่ (มือถือเป็นหลัก)
 *
 * ใช้แผนที่จริงของ Google ไม่ใช่ภาพจำลอง — หมุดคือราคาเริ่มต้นของหอนั้นจริงๆ
 * แตะหมุด = เลื่อนการ์ดล่างไปใบเดียวกัน · เลื่อนแผนที่แล้วกด "ค้นหาในพื้นที่นี้" = กรองเฉพาะหอที่อยู่ในกรอบที่เห็น
 */

const TEXT = {
  th: {
    searchHere: 'ค้นหาในพื้นที่นี้',
    listView: 'ดูแบบรายการ',
    myLocation: 'ตำแหน่งฉัน',
    perMonth: '/เดือน',
    perNight: '/คืน',
    available: (n: number) => `ว่าง ${n} ห้อง`,
    full: 'ห้องเต็ม',
    noResult: 'ไม่มีหอพักในพื้นที่นี้ ลองเลื่อนแผนที่ออกแล้วค้นหาใหม่',
    counted: (n: number) => `${n} หอพัก`,
    clearArea: 'ล้างพื้นที่',
    noCoords: 'หอนี้ยังไม่ได้ปักหมุดพิกัด',
  },
  en: {
    searchHere: 'Search this area',
    listView: 'List view',
    myLocation: 'My location',
    perMonth: '/month',
    perNight: '/night',
    available: (n: number) => `${n} rooms left`,
    full: 'Fully booked',
    noResult: 'No dorms in this area — zoom out and search again',
    counted: (n: number) => `${n} dorms`,
    clearArea: 'Clear area',
    noCoords: 'This dorm has no pin yet',
  },
};

function MapSearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { lang } = useLang();
  const t = TEXT[lang];

  const province = params.get('province') ?? undefined;
  const district = params.get('district');
  const dailyMode = params.get('rental') === 'daily';
  const { dorms, loading } = useDormSearch({ q: params.get('q') ?? undefined, province });

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const cardsRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // กรอบพื้นที่ที่ผู้ใช้กด "ค้นหาในพื้นที่นี้" — null = ไม่จำกัดพื้นที่
  const [bounds, setBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [moved, setMoved] = useState(false);

  const roomOk = useCallback(
    (r: (typeof dorms)[number]['rooms'][number]) =>
      r.status.toUpperCase() === 'AVAILABLE' && (dailyMode ? !!r.allowDaily && (r.pricePerDay ?? 0) > 0 : !r.allowDaily),
    [dailyMode],
  );

  // หอที่มีพิกัดจริงเท่านั้นถึงจะขึ้นแผนที่ได้ (0,0 = ยังไม่ได้ปักหมุด)
  const pinned = useMemo(
    () =>
      dorms
        .filter((d) => d.lat && d.lng)
        .filter((d) => !district || addressInDistrict(d.address, district))
        .map((d) => {
          const rooms = d.rooms.filter(roomOk);
          const prices = rooms.map((r) => (dailyMode ? r.pricePerDay ?? 0 : r.pricePerMonth));
          return { dorm: d, rooms, cheapest: prices.length ? Math.min(...prices) : null };
        })
        .filter((x) => !dailyMode || x.rooms.length > 0),
    [dorms, district, dailyMode, roomOk],
  );

  const visible = useMemo(() => {
    if (!bounds) return pinned;
    return pinned.filter(
      (x) =>
        x.dorm.lat >= bounds.south &&
        x.dorm.lat <= bounds.north &&
        x.dorm.lng >= bounds.west &&
        x.dorm.lng <= bounds.east,
    );
  }, [pinned, bounds]);

  // ---------- สร้างแผนที่ ----------
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = new g.maps.Map(containerRef.current, {
          center: { lat: 16.2, lng: 103.28 }, // มหาสารคาม — ขยับเองทันทีที่มีหอในลิสต์
          zoom: 13,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: false,
          clickableIcons: false,
        });
        mapRef.current = map;
        map.addListener('dragend', () => setMoved(true));
        map.addListener('zoom_changed', () => setMoved(true));
      })
      .catch(() => setMapError('โหลดแผนที่ไม่สำเร็จ'));
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- หมุดราคา ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined') return;

    const wanted = new Set(pinned.map((x) => x.dorm.id));
    for (const [id, marker] of markersRef.current) {
      if (!wanted.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }

    for (const x of pinned) {
      const active = x.dorm.id === selectedId;
      const label = x.cheapest != null ? `฿${x.cheapest.toLocaleString()}` : t.full;
      // หมุดวาดเป็น SVG เอง เพื่อให้เห็นราคาบนหมุดโดยตรง (หมุดมาตรฐานใส่ข้อความยาวไม่ได้)
      const width = 26 + label.length * 8;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="38">
        <rect x="1" y="1" rx="13" width="${width - 2}" height="28" fill="${active ? '#2F6FE0' : '#ffffff'}" stroke="${active ? '#1E4FB0' : '#D5E4FF'}" stroke-width="1.5"/>
        <path d="M${width / 2 - 6} 28 L${width / 2} 36 L${width / 2 + 6} 28 Z" fill="${active ? '#2F6FE0' : '#ffffff'}"/>
        <text x="${width / 2}" y="19" font-family="IBM Plex Sans, sans-serif" font-size="13" font-weight="700"
          fill="${active ? '#ffffff' : '#1E4FB0'}" text-anchor="middle">${label}</text>
      </svg>`;
      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        anchor: new google.maps.Point(width / 2, 38),
      };

      const existing = markersRef.current.get(x.dorm.id);
      if (existing) {
        existing.setIcon(icon);
        existing.setZIndex(active ? 999 : 1);
        continue;
      }
      const marker = new google.maps.Marker({ position: { lat: x.dorm.lat, lng: x.dorm.lng }, map, icon, zIndex: 1 });
      marker.addListener('click', () => setSelectedId(x.dorm.id));
      markersRef.current.set(x.dorm.id, marker);
    }
  }, [pinned, selectedId, t.full]);

  // จัดกรอบให้เห็นทุกหมุดครั้งแรกที่ได้ข้อมูล
  const fittedRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || pinned.length === 0 || typeof google === 'undefined') return;
    fittedRef.current = true;
    if (pinned.length === 1) {
      map.setCenter({ lat: pinned[0].dorm.lat, lng: pinned[0].dorm.lng });
      map.setZoom(15);
      return;
    }
    const b = new google.maps.LatLngBounds();
    pinned.forEach((x) => b.extend({ lat: x.dorm.lat, lng: x.dorm.lng }));
    map.fitBounds(b, 64);
  }, [pinned]);

  // แตะหมุดแล้วเลื่อนการ์ดล่างไปใบเดียวกัน
  useEffect(() => {
    if (!selectedId || !cardsRef.current) return;
    const el = cardsRef.current.querySelector(`[data-dorm="${selectedId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedId]);

  function searchThisArea() {
    const map = mapRef.current;
    const b = map?.getBounds();
    if (!b) return;
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    setBounds({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() });
    setMoved(false);
  }

  function locateMe() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.setCenter(here);
        mapRef.current?.setZoom(15);
        new google.maps.Marker({
          position: here,
          map: mapRef.current!,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2F6FE0',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
          zIndex: 500,
        });
        setMoved(true);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  const backHref = `/search?${params.toString()}`;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#E9ECF3]">
      {/* ===== top bar ===== */}
      <div className="z-20 flex items-center gap-3 bg-[#0E1220] px-3 py-2.5 pt-[max(env(safe-area-inset-top),10px)]">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label={t.listView}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-bold text-white">
            {province ?? 'ทั้งหมด'}
            {district ? ` · ${district}` : ''}
          </div>
          <div className="text-[11.5px] text-[#9FB2D4]">{t.counted(visible.length)}</div>
        </div>
        <Link
          href={backHref}
          className="flex h-9 items-center rounded-[10px] bg-tenant px-3.5 text-[12.5px] font-bold text-white"
        >
          {t.listView}
        </Link>
      </div>

      {/* ===== แผนที่ ===== */}
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#E9ECF3] px-6 text-center text-sm text-ink-faint">
            {mapError}
          </div>
        )}

        {/* ค้นหาในพื้นที่นี้ — โผล่เมื่อเลื่อน/ซูมแผนที่แล้วเท่านั้น */}
        {moved && (
          <button
            type="button"
            onClick={searchThisArea}
            className="absolute left-1/2 top-3 z-10 flex h-10 -translate-x-1/2 items-center gap-2 rounded-pill bg-[#0E1220] px-5 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(8,12,24,0.35)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2" />
              <path d="M21 21l-4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t.searchHere}
          </button>
        )}

        {bounds && !moved && (
          <button
            type="button"
            onClick={() => setBounds(null)}
            className="absolute left-1/2 top-3 z-10 flex h-9 -translate-x-1/2 items-center rounded-pill bg-white px-4 text-[12.5px] font-bold text-ink-body shadow-[0_8px_20px_rgba(16,24,40,0.18)]"
          >
            {t.clearArea}
          </button>
        )}

        {/* ปุ่มควบคุมขวา */}
        <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
          <button
            type="button"
            onClick={locateMe}
            aria-label={t.myLocation}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-[0_6px_16px_rgba(16,24,40,0.18)]"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" stroke="#2F6FE0" strokeWidth="2" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#2F6FE0" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="overflow-hidden rounded-xl bg-white shadow-[0_6px_16px_rgba(16,24,40,0.18)]">
            <button
              type="button"
              aria-label="zoom in"
              onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 13) + 1)}
              className="flex h-10 w-10 items-center justify-center text-[19px] font-bold text-ink-body"
            >
              +
            </button>
            <div className="h-px bg-card-border" />
            <button
              type="button"
              aria-label="zoom out"
              onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 13) - 1)}
              className="flex h-10 w-10 items-center justify-center text-[19px] font-bold text-ink-body"
            >
              −
            </button>
          </div>
        </div>
      </div>

      {/* ===== การ์ดล่าง เลื่อนแนวนอน ===== */}
      <div className="z-20 bg-transparent pb-[max(env(safe-area-inset-bottom),12px)]">
        {loading && pinned.length === 0 ? null : visible.length === 0 ? (
          <div className="mx-3 mb-3 rounded-[15px] bg-white p-4 text-center text-[13px] text-ink-faint shadow-[0_8px_24px_rgba(16,24,40,0.14)]">
            {t.noResult}
          </div>
        ) : (
          <div ref={cardsRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 pt-3">
            {visible.map(({ dorm, rooms, cheapest }) => (
              <Link
                key={dorm.id}
                data-dorm={dorm.id}
                href={`/dorms/${dorm.id}${dailyMode ? '?rental=daily' : ''}`}
                onMouseEnter={() => setSelectedId(dorm.id)}
                className={`flex w-[290px] shrink-0 snap-center gap-3 rounded-[15px] border bg-white p-2.5 shadow-[0_8px_24px_rgba(16,24,40,0.14)] ${
                  dorm.id === selectedId ? 'border-tenant' : 'border-card-border'
                }`}
              >
                <div className="h-[86px] w-[92px] shrink-0 overflow-hidden rounded-[11px] bg-surface-canvas">
                  {dorm.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dorm.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="truncate text-[14.5px] font-bold tracking-tight">{dorm.name}</div>
                  <div className="mt-0.5 truncate text-[11.5px] text-ink-faint">
                    {dorm.university || dorm.province}
                  </div>
                  <div className="mt-1 text-[11.5px] font-semibold text-[#12704A]">
                    {rooms.length > 0 ? t.available(rooms.length) : t.full}
                  </div>
                  <div className="mt-1.5">
                    {cheapest != null ? (
                      <>
                        <span className="font-sans text-[17px] font-extrabold text-tenant">
                          ฿{cheapest.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-ink-faint">{dailyMode ? t.perNight : t.perMonth}</span>
                      </>
                    ) : (
                      <span className="text-[12px] text-ink-faint">{t.full}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapSearchPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MapSearchInner />
    </Suspense>
  );
}
