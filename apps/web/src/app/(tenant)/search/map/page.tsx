'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { addressInDistrict } from '@hopak/shared';
import { useDormSearch } from '@/hooks/useDormSearch';
import { useLang } from '@/hooks/useLang';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { haversineKm } from '@/lib/geo';
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
    away: (km: number) => (km < 1 ? `ห่างคุณ ${Math.round(km * 1000)} ม.` : `ห่างคุณ ${km.toFixed(1)} กม.`),
    tapAgain: 'แตะอีกครั้งเพื่อดูรายละเอียดหอ',
    needLocation: 'เปิดตำแหน่งเพื่อดูระยะทาง',
    navigate: 'นำทาง',
    routing: 'กำลังหาเส้นทาง...',
    clearRoute: 'ปิดเส้นทาง',
    routeFailed: 'หาเส้นทางไม่สำเร็จ',
    openInMaps: 'เปิดใน Google Maps',
    byCar: 'ขับรถ',
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
    away: (km: number) => (km < 1 ? `${Math.round(km * 1000)} m from you` : `${km.toFixed(1)} km from you`),
    tapAgain: 'Tap again to open the dorm',
    needLocation: 'Turn on location to see distance',
    navigate: 'Directions',
    routing: 'Finding route...',
    clearRoute: 'Hide route',
    routeFailed: 'Could not find a route',
    openInMaps: 'Open in Google Maps',
    byCar: 'Driving',
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
  // เส้นโยงจากตำแหน่งเราไปหอที่เลือก + หมุดตำแหน่งเรา (เก็บ ref ไว้ลบ/วาดใหม่ ไม่งั้นซ้อนกันทุกครั้งที่เลือกใหม่)
  const routeRef = useRef<google.maps.Polyline | null>(null);
  const meMarkerRef = useRef<google.maps.Marker | null>(null);
  // เส้นทางตามถนนจริง — ยิง Directions เฉพาะตอนกดปุ่มนำทาง (คิดเงินต่อการเรียก ห้ามยิงอัตโนมัติทุกครั้งที่เลือกหอ)
  const directionsRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [routeDormId, setRouteDormId] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // กรอบพื้นที่ที่ผู้ใช้กด "ค้นหาในพื้นที่นี้" — null = ไม่จำกัดพื้นที่
  const [bounds, setBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [moved, setMoved] = useState(false);
  // ตำแหน่งผู้ใช้ — ใช้คิดระยะทางไปแต่ละหอ (ขอครั้งเดียวตอนเข้าหน้า ไม่ได้ก็แค่ไม่โชว์ระยะ)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMyLocation(null),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

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

  // หมุดตำแหน่งเรา — วาดครั้งเดียว ขยับตามเมื่อได้พิกัดใหม่
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !myLocation || typeof google === 'undefined') return;
    if (meMarkerRef.current) {
      meMarkerRef.current.setPosition(myLocation);
      return;
    }
    meMarkerRef.current = new google.maps.Marker({
      position: myLocation,
      map,
      zIndex: 500,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#2F6FE0',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      },
    });
  }, [myLocation]);

  /**
   * เส้นโยงจากตำแหน่งเราไปหอที่เลือก
   * เป็นเส้นตรงจงใจ ไม่ใช่เส้นทางตามถนน — Directions API คิดเงินต่อการเรียก
   * และหน้านี้ผู้ใช้กดเลือกหอสลับไปมาได้เรื่อยๆ ถ้ายิงทุกครั้งค่าใช้จ่ายบานแน่
   * อยากได้เส้นทางจริงมีปุ่ม "นำทาง" เปิด Google Maps ให้แทน (ฟรี ไม่ผ่าน API)
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined') return;

    routeRef.current?.setMap(null);
    routeRef.current = null;

    const target = pinned.find((x) => x.dorm.id === selectedId);
    // มีเส้นทางตามถนนอยู่แล้วไม่ต้องวาดเส้นตรงซ้อน
    if (!selectedId || !myLocation || !target || routeDormId === selectedId) return;

    routeRef.current = new google.maps.Polyline({
      map,
      path: [myLocation, { lat: target.dorm.lat, lng: target.dorm.lng }],
      strokeOpacity: 0,
      // เส้นประ — วาดด้วยจุดวงกลมเรียงกัน (Polyline ธรรมดาไม่มี dash)
      icons: [
        {
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 3.2, fillColor: '#2F6FE0', fillOpacity: 1, strokeWeight: 0 },
          offset: '0',
          repeat: '13px',
        },
      ],
      zIndex: 400,
    });
  }, [selectedId, myLocation, pinned, routeDormId]);

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

  /** ขอเส้นทางตามถนนจาก Google แล้ววาดลงแผนที่ของเราเอง */
  async function showRoute(dorm: { id: string; lat: number; lng: number }) {
    if (!mapRef.current || !myLocation || typeof google === 'undefined') return;
    setRouteBusy(true);
    setRouteError(false);
    try {
      const service = new google.maps.DirectionsService();
      const result = await service.route({
        origin: myLocation,
        destination: { lat: dorm.lat, lng: dorm.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      });

      // เส้นตรงเดิมออกไป ใช้เส้นทางจริงแทน
      routeRef.current?.setMap(null);
      routeRef.current = null;

      if (!directionsRef.current) {
        directionsRef.current = new google.maps.DirectionsRenderer({
          map: mapRef.current,
          // หมุดของเราเองมีอยู่แล้ว (ตำแหน่งเรา + หมุดราคา) ไม่ต้องให้ Google วาดหมุด A/B ทับ
          suppressMarkers: true,
          preserveViewport: false,
          polylineOptions: { strokeColor: '#2F6FE0', strokeWeight: 5, strokeOpacity: 0.9 },
        });
      }
      directionsRef.current.setMap(mapRef.current);
      directionsRef.current.setDirections(result);

      const leg = result.routes[0]?.legs[0];
      setRouteInfo(
        leg ? { distance: leg.distance?.text ?? '', duration: leg.duration?.text ?? '' } : null,
      );
      setRouteDormId(dorm.id);
      setMoved(false);
    } catch {
      // ปกติเป็นเพราะยังไม่ได้เปิด Directions API กับคีย์ที่ใช้อยู่ — ให้ปุ่มสำรองเปิด Google Maps แทน
      setRouteError(true);
    } finally {
      setRouteBusy(false);
    }
  }

  function clearRoute() {
    directionsRef.current?.setMap(null);
    setRouteDormId(null);
    setRouteInfo(null);
    setRouteError(false);
  }

  function locateMe() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(here);
        mapRef.current?.setCenter(here);
        mapRef.current?.setZoom(15);
        // หมุดตำแหน่งเราวาดจาก effect ที่ผูกกับ myLocation แล้ว — สร้างซ้ำตรงนี้จะได้หมุดซ้อนกันทุกครั้งที่กด
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

        {/* สรุปเส้นทางที่กำลังโชว์ */}
        {routeInfo && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2.5 rounded-[13px] bg-white px-3.5 py-2 shadow-[0_8px_22px_rgba(16,24,40,0.2)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#EAF1FF]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 17h2l1-3h8l1 3h2M6 14l1.5-5h9L18 14M7.5 17.5h.01M16.5 17.5h.01" stroke="#2F6FE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <div className="font-sans text-[15px] font-extrabold leading-tight text-ink-strong">
                {routeInfo.duration}
              </div>
              <div className="text-[11.5px] text-ink-faint">
                {routeInfo.distance} · {t.byCar}
              </div>
            </div>
          </div>
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
            {visible.map(({ dorm, rooms, cheapest }) => {
              const active = dorm.id === selectedId;
              const km = myLocation ? haversineKm(myLocation.lat, myLocation.lng, dorm.lat, dorm.lng) : null;
              return (
              <button
                key={dorm.id}
                type="button"
                data-dorm={dorm.id}
                // แตะครั้งแรก = เลือกหอ (หมุดไฮไลต์ + โชว์ระยะจากตำแหน่งเรา)
                // แตะซ้ำที่ใบเดิม = เข้าหน้ารายละเอียดหอ — กันกดพลาดตอนเลื่อนการ์ดผ่านๆ
                onClick={() => {
                  if (active) router.push(`/dorms/${dorm.id}${dailyMode ? '?rental=daily' : ''}`);
                  else {
                    if (routeDormId && routeDormId !== dorm.id) clearRoute();
                    setSelectedId(dorm.id);
                  }
                }}
                className={`flex w-[290px] shrink-0 snap-center gap-3 rounded-[15px] border bg-white p-2.5 text-left shadow-[0_8px_24px_rgba(16,24,40,0.14)] ${
                  active ? 'border-tenant' : 'border-card-border'
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
                  {/* ระยะทางโผล่เฉพาะใบที่เลือก — แตะซ้ำถึงจะเข้าหน้าหอ */}
                  {active && (
                    <div className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-tenant">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1118 0z" stroke="#2F6FE0" strokeWidth="2" />
                        <circle cx="12" cy="10" r="3" stroke="#2F6FE0" strokeWidth="2" />
                      </svg>
                      {km != null ? `${t.away(km)} · ${t.tapAgain}` : t.needLocation}
                    </div>
                  )}
                  {/* เส้นทางตามถนนจริง — ยิง Directions ตอนกดเท่านั้น */}
                  {active && myLocation && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {routeDormId === dorm.id ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearRoute();
                          }}
                          className="inline-flex h-7 items-center rounded-pill bg-[#F4F6FA] px-3 text-[11.5px] font-bold text-[#5B616C]"
                        >
                          {t.clearRoute}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={routeBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            void showRoute(dorm);
                          }}
                          className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-[#EAF1FF] px-3 text-[11.5px] font-bold text-[#1E4FB0] disabled:opacity-60"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2l9 20-9-5-9 5 9-20z" stroke="#1E4FB0" strokeWidth="1.9" strokeLinejoin="round" />
                          </svg>
                          {routeBusy ? t.routing : t.navigate}
                        </button>
                      )}

                      {/* เรียก Directions ไม่ผ่าน (คีย์ยังไม่ได้เปิด API) — ยังไปต่อได้ด้วยแอป Google Maps */}
                      {routeError && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${myLocation.lat},${myLocation.lng}&destination=${dorm.lat},${dorm.lng}&travelmode=driving`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex h-7 items-center rounded-pill bg-[#FFF3E0] px-3 text-[11.5px] font-bold text-[#C77B14]"
                        >
                          {t.openInMaps}
                        </a>
                      )}
                    </div>
                  )}
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
              </button>
              );
            })}
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
