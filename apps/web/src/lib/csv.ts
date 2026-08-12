/**
 * ดาวน์โหลดตารางเป็นไฟล์ CSV เปิดใน Excel ได้
 * ต้องนำหน้าด้วย BOM (﻿) ไม่งั้น Excel อ่านภาษาไทยเป็นตัวยึกยือ
 */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    let s = v == null ? '' : String(v);
    // กัน formula injection: Excel/LibreOffice ประเมินเซลล์ที่ขึ้นต้นด้วย = + - @ หรือ tab/CR เป็นสูตร
    // (เช่น ชื่อหอ/ชื่อผู้เช่าที่ผู้ใช้พิมพ์เองว่า =HYPERLINK(...)) → เติม ' นำหน้าให้เป็นข้อความล้วน
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    // ค่าที่มี , " หรือขึ้นบรรทัดใหม่ ต้องครอบด้วย " และ escape " เป็น ""
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
