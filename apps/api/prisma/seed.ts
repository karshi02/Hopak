import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hopak.com' },
    update: {},
    create: {
      role: 'ADMIN',
      name: 'Hopak Admin',
      email: 'admin@hopak.com',
      admin: { create: { adminRole: 'SUPER_ADMIN' } },
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@hopak.com' },
    update: {},
    create: {
      role: 'OWNER',
      name: 'เจ้าของหอทดสอบ',
      email: 'owner@hopak.com',
    },
  });

  const dorm = await prisma.dorm.create({
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
  });

  console.log({ admin: admin.id, owner: owner.id, dorm: dorm.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
