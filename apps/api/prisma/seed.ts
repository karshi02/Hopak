import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// รหัส seed: prod ต้องส่งผ่าน env SEED_PASSWORD (บังคับ ห้ามใช้ค่า default ที่เดาได้)
// dev เท่านั้นที่ fallback 'hopak1234' ได้เพื่อความสะดวก
const isProd = process.env.NODE_ENV === 'production';
const SEED_PASSWORD = process.env.SEED_PASSWORD || (isProd ? '' : 'hopak1234');
if (isProd && !SEED_PASSWORD) {
  throw new Error(
    '[SECURITY] การ seed บน production ต้องตั้ง env SEED_PASSWORD — ปฏิเสธการ seed ด้วยรหัส default ที่เดาได้',
  );
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // สำคัญ: upsert ไม่รีเซ็ต password ของบัญชีที่มีอยู่แล้ว (update ไม่แตะ password)
  // ป้องกัน re-seed แล้วรหัสที่ admin เปลี่ยนไว้เองถูกดีดกลับเป็นรหัส seed
  const admin = await prisma.user.upsert({
    where: { email_role: { email: 'admin@hopak.com', role: 'ADMIN' } },
    update: {},
    create: {
      role: 'ADMIN',
      name: 'Hopak Admin',
      email: 'admin@hopak.com',
      password: passwordHash,
      admin: { create: { adminRole: 'SUPER_ADMIN' } },
    },
  });

  const owner = await prisma.user.upsert({
    where: { email_role: { email: 'owner@hopak.com', role: 'OWNER' } },
    update: {},
    create: {
      role: 'OWNER',
      name: 'เจ้าของหอทดสอบ',
      email: 'owner@hopak.com',
      password: passwordHash,
    },
  });

  const existingDorm = await prisma.dorm.findFirst({ where: { ownerId: owner.id } });
  const dorm =
    existingDorm ??
    (await prisma.dorm.create({
      data: {
        ownerId: owner.id,
        name: 'หอทดสอบ Hopak',
        description: 'หอพักตัวอย่างสำหรับ seed',
        province: 'มหาสารคาม',
        university: 'มหาวิทยาลัยมหาสารคาม',
        lat: 16.246,
        lng: 103.252,
        waterRate: 18,
        electricRate: 8,
        deposit: 3000,
        amenities: ['wifi', 'parking'],
        images: [],
        status: 'APPROVED',
        rooms: {
          create: [
            { type: 'AIR', pricePerMonth: 3500, status: 'AVAILABLE' },
            { type: 'FAN', pricePerMonth: 2000, status: 'AVAILABLE' },
          ],
        },
      },
    }));

  console.log({ admin: admin.id, owner: owner.id, dorm: dorm.id, seedPassword: SEED_PASSWORD });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
