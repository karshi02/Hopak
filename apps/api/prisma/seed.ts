import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'hopak1234';

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@hopak.com' },
    update: { password: passwordHash },
    create: {
      role: 'ADMIN',
      name: 'Hopak Admin',
      email: 'admin@hopak.com',
      password: passwordHash,
      admin: { create: { adminRole: 'SUPER_ADMIN' } },
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@hopak.com' },
    update: { password: passwordHash },
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
