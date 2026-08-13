// Backfill emailVerified สำหรับบัญชีเจ้าของหอที่สมัครผ่านขั้นตอน OTP จริงเท่านั้น
// (ไม่แตะบัญชีที่แอดมินสร้างให้ — บัญชีพวกนั้นไม่เคยพิสูจน์ว่าเป็นเจ้าของอีเมลนั้นจริง)
// รันแบบดูอย่างเดียว: node backfill_owner_verified.js
// รันจริง:            node backfill_owner_verified.js --apply
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const apply = process.argv.includes('--apply');

  // อีเมลที่ยืนยันตัวตนผ่าน OTP ในขั้นตอนสมัครเปิดหอพักและสมัครจนจบแล้ว
  const verifiedApps = await prisma.ownerApplication.findMany({
    // COMPLETED = ผ่าน verifyOtp มาแล้วแน่นอน (finish() เช็ค verifiedSecretHash ก่อนเสมอ แล้วล้างทิ้งตอนจบ)
    where: { status: 'COMPLETED' },
    select: { email: true },
  });
  const emails = verifiedApps.map((a) => a.email);

  const targets = await prisma.user.findMany({
    where: { role: 'OWNER', emailVerified: false, email: { in: emails } },
    select: { id: true, email: true },
  });

  const skipped = await prisma.user.findMany({
    where: { role: 'OWNER', emailVerified: false, email: { notIn: emails } },
    select: { email: true },
  });

  console.log('จะตั้ง emailVerified = true:', targets.map((u) => u.email));
  console.log('ข้าม (ไม่มีหลักฐาน OTP เช่น แอดมินสร้างให้):', skipped.map((u) => u.email));

  if (apply && targets.length) {
    const res = await prisma.user.updateMany({
      where: { id: { in: targets.map((u) => u.id) } },
      data: { emailVerified: true },
    });
    console.log('updated', res.count);
  } else if (!apply) {
    console.log('\n(ยังไม่ได้เขียนอะไร — ใส่ --apply เพื่อรันจริง)');
  }
  await prisma.$disconnect();
})();
