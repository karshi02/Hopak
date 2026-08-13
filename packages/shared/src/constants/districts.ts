/**
 * อำเภอในมหาสารคาม — ใช้แตกการ์ดย่อยใต้ "ทำเลยอดนิยม" หน้าแรก และกรองในหน้าค้นหา
 *
 * ระบบไม่มีฟิลด์อำเภอแยก ต้องจับจากข้อความ address ของหอ ซึ่งมาได้ 2 แบบ:
 * ไทย (คนกรอกเอง) กับอังกฤษ (Google Places คืนมาเป็น "Amphoe Mueang Maha Sarakham")
 * เลยต้องเก็บชื่อพ้องทั้งสองภาษา รวมสะกดที่พบบ่อย
 */
export interface District {
  /** ชื่อที่โชว์บนการ์ด + ค่าที่ส่งใน query string */
  name: string;
  /** ข้อความที่ถือว่า "อยู่ในอำเภอนี้" ถ้าเจอใน address (เทียบแบบไม่สนตัวพิมพ์) */
  aliases: string[];
}

export const MSK_PROVINCE = 'มหาสารคาม';

export const MSK_DISTRICTS: District[] = [
  { name: 'เมืองมหาสารคาม', aliases: ['เมืองมหาสารคาม', 'Mueang Maha Sarakham', 'Muang Maha Sarakham'] },
  { name: 'กันทรวิชัย', aliases: ['กันทรวิชัย', 'Kantharawichai'] },
  { name: 'โกสุมพิสัย', aliases: ['โกสุมพิสัย', 'Kosum Phisai'] },
  { name: 'บรบือ', aliases: ['บรบือ', 'Borabue', 'Borabu'] },
  { name: 'วาปีปทุม', aliases: ['วาปีปทุม', 'Wapi Pathum'] },
  { name: 'พยัคฆภูมิพิสัย', aliases: ['พยัคฆภูมิพิสัย', 'Phayakkhaphum Phisai'] },
  { name: 'นาเชือก', aliases: ['นาเชือก', 'Na Chueak'] },
  { name: 'เชียงยืน', aliases: ['เชียงยืน', 'Chiang Yuen', 'Chiang Yun'] },
  { name: 'แกดำ', aliases: ['แกดำ', 'Kae Dam'] },
  { name: 'นาดูน', aliases: ['นาดูน', 'Na Dun'] },
  { name: 'ยางสีสุราช', aliases: ['ยางสีสุราช', 'Yang Sisurat'] },
  { name: 'กุดรัง', aliases: ['กุดรัง', 'Kut Rang'] },
  { name: 'ชื่นชม', aliases: ['ชื่นชม', 'Chuen Chom'] },
];

/** อำเภอของ address นี้ (มหาสารคามเท่านั้น) — หาไม่เจอ = null */
export function findDistrict(address: string | null | undefined): string | null {
  if (!address) return null;
  const haystack = address.toLowerCase();
  const hit = MSK_DISTRICTS.find((d) => d.aliases.some((a) => haystack.includes(a.toLowerCase())));
  return hit?.name ?? null;
}

/** address อยู่ในอำเภอชื่อนี้ไหม — ไม่รู้จักชื่ออำเภอ หรือ address ว่าง = false */
export function addressInDistrict(address: string | null | undefined, districtName: string): boolean {
  if (!address) return false;
  const district = MSK_DISTRICTS.find((d) => d.name === districtName);
  if (!district) return false;
  const haystack = address.toLowerCase();
  return district.aliases.some((a) => haystack.includes(a.toLowerCase()));
}
