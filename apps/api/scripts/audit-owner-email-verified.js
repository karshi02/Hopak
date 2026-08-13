// ตรวจว่าบัญชีเจ้าของหอที่ emailVerified = true มีหลักฐาน OTP รองรับจริงไหม
// --fix = ตั้งกลับเป็น false ให้บัญชีที่ไม่มีหลักฐาน (แอดมินสร้างให้ ฯลฯ)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const fix = process.argv.includes('--fix');

  const apps = await prisma.ownerApplication.findMany({
    // COMPLETED = ผ่าน verifyOtp มาแล้วแน่นอน (finish() เช็ค verifiedSecretHash ก่อนเสมอ แล้วล้างทิ้งตอนจบ)
    where: { status: 'COMPLETED' },
    select: { email: true },
  });
  const proven = new Set(apps.map((a) => a.email));

  const owners = await prisma.user.findMany({
    where: { role: 'OWNER' },
    select: { id: true, email: true, emailVerified: true, googleId: true },
  });

  const rows = owners.map((u) => ({
    email: u.email,
    emailVerified: u.emailVerified,
    hasGoogle: !!u.googleId,
    // googleId อยู่แล้ว = ล็อกอิน Google มาก่อน ถือว่าพิสูจน์อีเมลแล้วเช่นกัน
    proof: u.email && proven.has(u.email) ? 'OTP สมัครเปิดหอ' : u.googleId ? 'Google' : 'ไม่มี',
  }));
  console.table(rows);

  const unproven = owners.filter(
    (u) => u.emailVerified && !u.googleId && !(u.email && proven.has(u.email)),
  );
  console.log('ยืนยันแล้วแต่ไม่มีหลักฐาน:', unproven.map((u) => u.email));

  if (fix && unproven.length) {
    const res = await prisma.user.updateMany({
      where: { id: { in: unproven.map((u) => u.id) } },
      data: { emailVerified: false },
    });
    console.log('ตั้งกลับเป็น false:', res.count);
  } else if (!fix) {
    console.log('(ยังไม่ได้เขียนอะไร — ใส่ --fix เพื่อแก้)');
  }
  await prisma.$disconnect();
})();
