// จังหวัดที่ระบบเปิดให้ค้นหา/แสดงผลเป็นหลัก (มีหอพักจริงในระบบแล้ว)
export const PROVINCES = ['มหาสารคาม', 'ขอนแก่น', 'เชียงใหม่'] as const;

export type Province = (typeof PROVINCES)[number];

// 77 จังหวัดทั้งประเทศ — ใช้ตอนเจ้าของหอลงทะเบียนหอพัก (เปิดหอได้ทุกจังหวัด ไม่จำกัดแค่ 3 จังหวัดข้างบน)
export const ALL_PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
  'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
  'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต',
  'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี',
  'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี',
  'อุบลราชธานี',
] as const;

/**
 * แปลงชื่อจังหวัดจาก Google Maps (administrative_area_level_1) ให้ตรงกับรายชื่อในระบบ
 * Google คืนมาได้หลายแบบ: "Maha Sarakham", "จังหวัดมหาสารคาม", "Bangkok", "กรุงเทพมหานคร"
 */
const PROVINCE_ALIASES: Record<string, string> = {
  // ชื่ออังกฤษของทุกจังหวัด (Google คืนมาเป็นอังกฤษเมื่อ locale ไม่ใช่ไทย)
  'bangkok': 'กรุงเทพมหานคร',
  'krabi': 'กระบี่',
  'kanchanaburi': 'กาญจนบุรี',
  'kalasin': 'กาฬสินธุ์',
  'kamphaeng phet': 'กำแพงเพชร',
  'khon kaen': 'ขอนแก่น',
  'chanthaburi': 'จันทบุรี',
  'chachoengsao': 'ฉะเชิงเทรา',
  'chonburi': 'ชลบุรี',
  'chai nat': 'ชัยนาท',
  'chaiyaphum': 'ชัยภูมิ',
  'chumphon': 'ชุมพร',
  'chiang rai': 'เชียงราย',
  'chiang mai': 'เชียงใหม่',
  'trang': 'ตรัง',
  'trat': 'ตราด',
  'tak': 'ตาก',
  'nakhon nayok': 'นครนายก',
  'nakhon pathom': 'นครปฐม',
  'nakhon phanom': 'นครพนม',
  'nakhon ratchasima': 'นครราชสีมา',
  'nakhon si thammarat': 'นครศรีธรรมราช',
  'nakhon sawan': 'นครสวรรค์',
  'nonthaburi': 'นนทบุรี',
  'narathiwat': 'นราธิวาส',
  'nan': 'น่าน',
  'bueng kan': 'บึงกาฬ',
  'buriram': 'บุรีรัมย์',
  'pathum thani': 'ปทุมธานี',
  'prachuap khiri khan': 'ประจวบคีรีขันธ์',
  'prachinburi': 'ปราจีนบุรี',
  'pattani': 'ปัตตานี',
  'phra nakhon si ayutthaya': 'พระนครศรีอยุธยา',
  'phayao': 'พะเยา',
  'phang nga': 'พังงา',
  'phatthalung': 'พัทลุง',
  'phichit': 'พิจิตร',
  'phitsanulok': 'พิษณุโลก',
  'phetchaburi': 'เพชรบุรี',
  'phetchabun': 'เพชรบูรณ์',
  'phrae': 'แพร่',
  'phuket': 'ภูเก็ต',
  'mahasarakham': 'มหาสารคาม',
  'mukdahan': 'มุกดาหาร',
  'mae hong son': 'แม่ฮ่องสอน',
  'yasothon': 'ยโสธร',
  'yala': 'ยะลา',
  'roi et': 'ร้อยเอ็ด',
  'ranong': 'ระนอง',
  'rayong': 'ระยอง',
  'ratchaburi': 'ราชบุรี',
  'lopburi': 'ลพบุรี',
  'lampang': 'ลำปาง',
  'lamphun': 'ลำพูน',
  'loei': 'เลย',
  'sisaket': 'ศรีสะเกษ',
  'sakon nakhon': 'สกลนคร',
  'songkhla': 'สงขลา',
  'satun': 'สตูล',
  'samut prakan': 'สมุทรปราการ',
  'samut songkhram': 'สมุทรสงคราม',
  'samut sakhon': 'สมุทรสาคร',
  'sa kaeo': 'สระแก้ว',
  'saraburi': 'สระบุรี',
  'sing buri': 'สิงห์บุรี',
  'sukhothai': 'สุโขทัย',
  'suphan buri': 'สุพรรณบุรี',
  'surat thani': 'สุราษฎร์ธานี',
  'surin': 'สุรินทร์',
  'nong khai': 'หนองคาย',
  'nong bua lamphu': 'หนองบัวลำภู',
  'ang thong': 'อ่างทอง',
  'amnat charoen': 'อำนาจเจริญ',
  'udon thani': 'อุดรธานี',
  'uttaradit': 'อุตรดิตถ์',
  'uthai thani': 'อุทัยธานี',
  'ubon ratchathani': 'อุบลราชธานี',
  // รูปแบบสะกดอื่นที่ Google ใช้สลับไปมา
  'krung thep maha nakhon': 'กรุงเทพมหานคร',
  'maha sarakham': 'มหาสารคาม',
  'chon buri': 'ชลบุรี',
  'buri ram': 'บุรีรัมย์',
  'si sa ket': 'ศรีสะเกษ',
  'nong bua lam phu': 'หนองบัวลำภู',
  'lop buri': 'ลพบุรี',
  'phra nakhon si ayutthaya province': 'พระนครศรีอยุธยา',
  'samut prakarn': 'สมุทรปราการ',
  'ayutthaya': 'พระนครศรีอยุธยา',
  'korat': 'นครราชสีมา',
};

// คำนำหน้า/ต่อท้ายที่ Google ใส่มาแล้วแต่ภาษา — ต้องตัดทิ้งก่อนจับคู่
// เช่น "Changwat Khon Kaen", "Chang Wat Khon Kaen", "Khon Kaen Province", "จังหวัดขอนแก่น", "จ.ขอนแก่น"
function stripProvinceWords(value: string): string {
  return value
    .replace(/^จังหวัด\s*/i, '')
    .replace(/^จ\.\s*/i, '')
    .replace(/^chang\s*wat\s+/i, '')
    .replace(/^changwat\s+/i, '')
    .replace(/\s+province$/i, '')
    .trim();
}

export function normalizeProvince(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = stripProvinceWords(raw.trim());
  if (!trimmed) return null;

  const exact = ALL_PROVINCES.find((p) => p === trimmed);
  if (exact) return exact;

  const alias = PROVINCE_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  // ชื่อไทยฝังอยู่ในข้อความ (เช่น "อ.เมืองขอนแก่น") — เทียบชื่อยาวก่อนกันจับผิด
  // ("นครพนม" ต้องไม่ไปแมตช์กับ "นคร" ของจังหวัดอื่น)
  const thaiMatch = [...ALL_PROVINCES]
    .sort((a, b) => b.length - a.length)
    .find((p) => trimmed.includes(p));
  if (thaiMatch) return thaiMatch;

  // ชื่ออังกฤษฝังอยู่ในข้อความ — เทียบ key ที่ยาวที่สุดก่อนเช่นกัน
  const lower = trimmed.toLowerCase();
  const enKey = Object.keys(PROVINCE_ALIASES)
    .sort((a, b) => b.length - a.length)
    .find((key) => lower.includes(key));
  return enKey ? PROVINCE_ALIASES[enKey] : null;
}
