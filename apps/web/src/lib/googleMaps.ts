let loadPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __hopakGmapsCallback?: () => void;
    // Google เรียกเมื่อ key ผิด / ยังไม่เปิด API / ไม่ได้เปิด billing
    gm_authFailure?: () => void;
  }
}

// โหลด Google Maps JS API สคริปต์ครั้งเดียว (ใช้ร่วมกันทั้ง MapPicker และ Places Autocomplete)
// ใช้ callback= แบบ classic แทน loading=async เพราะ async ทำ google.maps.Map/places
// ยังไม่พร้อมใช้จริงตอน script onload ยิง (ต้อง importLibrary เพิ่ม) — callback รับประกันโหลดครบก่อนเรียก
export function loadGoogleMaps(): Promise<typeof google> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('window unavailable'));
    if (window.google?.maps?.Map) return resolve(window.google);

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ไม่ได้ตั้งค่า'));

    window.__hopakGmapsCallback = () => resolve(window.google);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__hopakGmapsCallback`;
    script.async = true;
    script.onerror = () => reject(new Error('โหลด Google Maps ไม่สำเร็จ'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
