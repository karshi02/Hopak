// แผนที่ไอคอน + ป้ายชื่อสิ่งอำนวยความสะดวกในห้อง (โค้ด ac/wifi/... → ไทย/อังกฤษ + path ไอคอน)
// ดึงออกมาจากหน้าเพิ่มห้อง (partner/rooms/new) เพื่อให้หน้ารายละเอียดหอใช้ป้าย/ไอคอนชุดเดียวกัน

export const AMENITY_ICON: Record<string, string> = {
  parking: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M10 16V8h3a2.5 2.5 0 010 5h-3',
  laundry: 'M5 3h14v18H5zM12 14m-3.5 0a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0M8 6h.01M11 6h.01',
  cctv: 'M3 7l14-3 2 6-14 3zM7 13v4a2 2 0 002 2h6',
  elevator: 'M6 3h12v18H6zM12 3v18M9 8l-1.5 2h3zM15 16l1.5-2h-3z',
  kitchen: 'M6 3h12v18H6zM6 10h12M9 5v3M15 14v4',
  pet: 'M12 14c3 0 5 2 5 4H7c0-2 2-4 5-4zM8 8m-2 0a2 2 0 104 0 2 2 0 10-4 0M16 8m-2 0a2 2 0 104 0 2 2 0 10-4 0',
  balcony: 'M4 12h16M4 12V8h16v4M6 12v9M18 12v9M10 12v9M14 12v9',
  ac: 'M4 6h16v9H4zM8 17v1M12 17v2M16 17v1',
  fan: 'M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0M12 10c0-4 1-6 3-6s2 3-1 5M14 12c4 0 6 1 6 3s-3 2-5-1M12 14c0 4-1 6-3 6s-2-3 1-5M10 12c-4 0-6-1-6-3s3-2 5 1',
  bath: 'M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4v-3zM6 12V6a2 2 0 012-2 2 2 0 012 2',
  heater: 'M6 3h12v18H6zM12 7v3M9 14h6',
  fridge: 'M6 3h12v18H6zM6 11h12M10 6v2M10 14v3',
  bed: 'M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6M3 14h18M7 10V8a1 1 0 011-1h3v3',
  desk: 'M3 8h18M5 8v11M19 8v11M5 8V5h14v3M8 12h8',
  wardrobe: 'M6 3h12v18H6zM12 3v18M10 9h.01M14 9h.01',
  wifi: 'M5 12a10 10 0 0114 0M8 15a6 6 0 018 0M12 18h.01',
  park: 'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0M10 16V8h3a2.5 2.5 0 010 5h-3',
  tv: 'M3 5h18v12H3zM8 21h8',
  security: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z',
};

export const AMENITY_LABEL: Record<string, { th: string; en: string }> = {
  ac: { th: 'แอร์', en: 'AC' },
  fan: { th: 'พัดลม', en: 'Fan' },
  bath: { th: 'ห้องน้ำในตัว', en: 'Private bathroom' },
  heater: { th: 'เครื่องทำน้ำอุ่น', en: 'Water heater' },
  fridge: { th: 'ตู้เย็น', en: 'Fridge' },
  bed: { th: 'เตียง', en: 'Bed' },
  desk: { th: 'โต๊ะ+เก้าอี้', en: 'Desk + chair' },
  wardrobe: { th: 'ตู้เสื้อผ้า', en: 'Wardrobe' },
  wifi: { th: 'WiFi', en: 'WiFi' },
  park: { th: 'ที่จอดรถ', en: 'Parking' },
  tv: { th: 'ทีวี', en: 'TV' },
  security: { th: 'รปภ. 24 ชม.', en: '24h security' },

  // โค้ดที่เจ้าของหอกรอกเองบ่อย (ตอนสมัครเปิดหอ / แก้ข้อมูลหอ) — ไม่ได้มาจากรายการติ๊กในหน้าเพิ่มห้อง
  // ไม่ map ไว้จะโชว์เป็นคำดิบอย่าง "wifi" "parking" บนหน้าค้นหา
  parking: { th: 'ที่จอดรถ', en: 'Parking' },
  aircon: { th: 'แอร์', en: 'AC' },
  air: { th: 'แอร์', en: 'AC' },
  laundry: { th: 'เครื่องซักผ้า', en: 'Laundry' },
  washing: { th: 'เครื่องซักผ้า', en: 'Laundry' },
  cctv: { th: 'กล้องวงจรปิด', en: 'CCTV' },
  elevator: { th: 'ลิฟต์', en: 'Elevator' },
  lift: { th: 'ลิฟต์', en: 'Elevator' },
  kitchen: { th: 'ครัว', en: 'Kitchen' },
  pet: { th: 'สัตว์เลี้ยงได้', en: 'Pets allowed' },
  pets: { th: 'สัตว์เลี้ยงได้', en: 'Pets allowed' },
  furniture: { th: 'เฟอร์นิเจอร์', en: 'Furnished' },
  water_heater: { th: 'เครื่องทำน้ำอุ่น', en: 'Water heater' },
  balcony: { th: 'ระเบียง', en: 'Balcony' },
  pool: { th: 'สระว่ายน้ำ', en: 'Pool' },
  gym: { th: 'ฟิตเนส', en: 'Gym' },
  keycard: { th: 'คีย์การ์ด', en: 'Key card' },
};

// ป้ายที่แสดง: ถ้าเป็นโค้ดที่รู้จักใช้ป้ายตามภาษา ไม่งั้นคืนค่าดิบ (เผื่อ amenity ที่พิมพ์เอง)
export function amenityLabel(code: string, lang: 'th' | 'en'): string {
  return AMENITY_LABEL[code]?.[lang] ?? code;
}
