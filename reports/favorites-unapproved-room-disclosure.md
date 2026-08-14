## Executive Summary

ผู้เช่าที่ล็อกอินแล้ว เช่น Mallory สามารถนำ `dormId` ของหอที่สถานะ `APPROVED` จากการค้นหาสาธารณะไปเรียก `POST /favorites/:dormId/toggle` แล้วเรียก `GET /favorites` ได้ แม้ Mallory จะใช้ JWT ของตนเองตามปกติ ไม่ได้ขโมยเซสชันหรือข้ามการยืนยันตัวตน แต่ผลลัพธ์ของรายการโปรดจะมีระเบียนห้องทั้งหมดของหอนั้น รวมถึงห้องที่ `approved: false` ซึ่งนโยบายการแสดงผลสาธารณะตั้งใจซ่อนไว้ ผลกระทบที่ยืนยันจากซอร์สจึงจำกัดอยู่ที่การเปิดเผย inventory และข้อมูลฟิลด์ของห้องที่รอตรวจในหอที่อนุมัติแล้ว ไม่ได้ยืนยันการจองห้องนั้นหรือการเข้าถึงไฟล์

ซอร์สที่ประเมินเป็น revision ที่ระบุสำหรับการตรวจนี้; metadata ของโครงการระบุเวอร์ชัน `0.0.1` แต่เป็นแพ็กเกจ private และไม่มี Git tag ที่ผูก revision นี้กับรุ่นเผยแพร่ จึงไม่สามารถยืนยันรุ่นที่ได้รับผลกระทบ รุ่นแรกที่ได้รับผลกระทบ หรือรุ่นที่แก้ไขแล้วได้ ประวัติของไฟล์แสดงว่าโมดูล favorites ถูกเพิ่มพร้อมพฤติกรรมนี้ใน change ที่ไม่มี tag และไม่พบการแก้ไขในประวัติที่ตรวจสอบ ฉันตรวจโค้ดและประวัติที่เกี่ยวข้องโดยตรง แต่ไม่ได้รันคำขอหรือ PoC กับระบบใด ๆ

## Background

ระบบแยกการมองเห็นห้องสำหรับผู้ใช้ทั่วไปออกจากข้อมูลภายใน: การค้นหาหอแบบสาธารณะเลือกเฉพาะหอ `APPROVED` และเฉพาะห้องที่ `approved: true` ขณะที่ผู้เช่าที่ล็อกอินสามารถเก็บหอไว้ในรายการโปรดของตัวเองได้ Mallory ต้องมีบัญชีผู้เช่าที่ใช้งานได้, JWT ที่ถูกต้อง, `dormId` ของหอที่อนุมัติแล้ว และหอนั้นต้องมีห้องอย่างน้อยหนึ่งแถวที่ยังไม่อนุมัติ ไม่มีการอ้างว่าค่าเงื่อนไขนี้มีอยู่ในทุก deployment

ส่วน public search ใน `apps/api/src/modules/dorms/dorms.service.ts`, ฟังก์ชัน `search` ของซอร์สที่ประเมิน ใช้เงื่อนไขดังนี้:

```ts
where: {
  status: 'APPROVED',
  province: query.province,
  university: query.university,
  // …
},
include: { rooms: { where: { approved: true } } },
```

โค้ดนี้แสดงทั้งนโยบายที่ตั้งใจไว้และแหล่งที่ Mallory สามารถได้ `dormId` ของหอที่อนุมัติแล้วอย่างถูกต้อง นโยบายเดียวกันปรากฏใน `apps/api/src/modules/rooms/rooms.service.ts`, `findOne` ซึ่งค้นหาห้องด้วย `approved: true` และ `dorm: { status: 'APPROVED' }`; ดังนั้นการเห็นรายการโปรดไม่ควรกลายเป็นช่องทางที่กว้างกว่าหน้า public

## Vulnerability Details

ที่ `apps/api/src/modules/favorites/favorites.controller.ts`, `FavoritesController` ครอบทั้ง `GET /favorites` และ `POST /favorites/:dormId/toggle` ด้วย `JwtAuthGuard` เท่านั้น แล้วส่ง `user.id` และ `dormId` ไปยัง service:

```ts
@Get()
listMine(@CurrentUser() user: { id: string }) {
  return this.favoritesService.listMine(user.id);
}

@Post(':dormId/toggle')
toggle(@CurrentUser() user: { id: string }, @Param('dormId') dormId: string) {
  return this.favoritesService.toggle(user.id, dormId);
}
```

การมี JWT จึงยืนยันเพียงว่า Mallory เป็นผู้ใช้ที่ล็อกอิน ไม่ได้ตรวจว่า `dormId` เป็นหอที่ควรเห็นในบริบท favorites. ที่ `apps/api/src/modules/favorites/favorites.service.ts`, `toggle` สร้างความสัมพันธ์ favorite จากค่าที่ส่งมาโดยไม่มีการอ่านหอหรือเงื่อนไขสถานะ:

```ts
await this.prisma.favorite.create({ data: { userId, dormId } });
return { favorited: true };
```

สำหรับ `dormId` ที่ Mallory ได้จาก public search การสร้างนี้ทำให้แถว favorite ของ Mallory ชี้ไปยังหอที่อนุมัติแล้ว ขั้นถัดไปใน `listMine` ดึง relation นี้กลับมา แต่ include ห้องโดยไม่มีตัวกรอง approval:

```ts
const favorites = await this.prisma.favorite.findMany({
  where: { userId },
  include: { dorm: { include: { rooms: true } } },
  orderBy: { createdAt: 'desc' },
});
return favorites.map((f) => f.dorm);
```

`rooms: true` คือจุดที่ต่างจาก public search: Prisma จะรวมทุกแถวห้องของหอที่ favorite ไว้ ไม่ใช่เฉพาะ `approved: true` ดังนั้นการตอบ `GET /favorites` คาดว่าจะบรรจุระเบียนของห้องที่ยังรอตรวจด้วย ตราบเท่าที่มีอยู่ในฐานข้อมูล การตรวจซอร์สไม่ได้ยืนยันรูปร่าง response จริงใน runtime หรือว่ามีข้อมูลห้องประเภทใดใน deployment หนึ่ง ๆ

ประวัติ Git ของ `favorites.service.ts` ย้อนกลับไปถึง change ที่เพิ่มไฟล์นี้และ query `rooms: true`; change นั้นไม่มี release tag และซอร์สที่ตรวจไม่มี fix สำหรับ query นี้ ด้วยเหตุนี้ประวัติพิสูจน์จุดเริ่มต้นใน repository ได้ แต่ไม่พิสูจน์ช่วงเวอร์ชันที่เผยแพร่

## Exploitability Analysis

primitive ที่โค้ดยืนยันคือผู้เช่าที่ล็อกอินสามารถอ่าน inventory ของห้อง `approved: false` ในหอ `APPROVED` ที่ตนใส่รายการโปรดเองได้ การอาศัย `dormId` ที่ public search คืนมาแยกกรณีนี้ออกจากการเดา identifier ของหอที่ยังไม่อนุมัติ และการที่ query favorites จำกัด `where: { userId }` ไม่ป้องกันปัญหา เพราะ Mallory สร้าง favorite ของบัญชีตนเองได้ก่อน

มี guard ที่สำคัญซึ่งจำกัดผลกระทบ: `apps/api/src/modules/bookings/bookings.service.ts`, `create` ปฏิเสธการจองเมื่อ `!room.approved || room.dorm.status !== 'APPROVED'` ดังนั้นรายงานนี้ไม่อ้างว่าการอ่านผ่าน favorites ทำให้จองห้องที่ยังไม่อนุมัติได้ และไม่มีซอร์สใน flow นี้ที่ให้สิทธิ์อ่านไฟล์หรือเอกสารของเจ้าของหอ

การป้องกันที่มีอยู่ใน endpoint ห้องสาธารณะเป็น negative control ของพฤติกรรมที่ต้องการ: `RoomsService.findOne` ใช้ `findFirst` พร้อม `id`, `approved: true` และสถานะหอ `APPROVED`; ห้องที่ยังไม่อนุมัติจึงไม่ควรได้จากเส้นทางนั้น การเปรียบเทียบนี้ชี้ว่าการรั่วเกิดจาก nested include ของ favorites ไม่ใช่เพียงเพราะ endpoint ห้องสาธารณะไม่มีการตรวจ

นอกจากนี้ `GET /bookings/availability/:roomId` ต้องใช้ JWT แต่ `BookingsService.bookedRanges` เลือกช่วงวันที่ด้วย `roomId` โดยไม่ตรวจ visibility ของห้องหรือหอ การตอบนี้เป็นข้อมูลคนละชนิดและยังไม่ได้ใช้เป็นส่วนของการโจมตีที่ตรวจยืนยัน; อย่างไรก็ดี เมื่อ favorites ส่ง `roomId` ของห้องที่ยังไม่อนุมัติกลับมา ควรถือเป็น endpoint ที่ต้องปรับให้รักษานโยบาย visibility เดียวกัน

## Proof of Concept

ไม่มี PoC หรือคำขอถูกเรียกใช้ในการประเมินนี้ จึงไม่มี output, response หรือผลการรันให้รายงาน ผลต่อไปนี้เป็นพฤติกรรมที่คาดจากซอร์สเท่านั้นและควรทำใน environment ทดสอบที่ได้รับอนุญาตและมีข้อมูลทิ้งได้:

1. ให้ `mallory` ล็อกอินเป็นผู้เช่า และค้นหาหอที่อนุมัติแล้วเพื่อรับ `dormId` ของหอที่มีห้อง `approved: false`.
2. ใช้ JWT ของ `mallory` เรียก `POST /favorites/<dormId>/toggle` เพื่อสร้าง favorite ของตนเอง.
3. ใช้ JWT เดิมเรียก `GET /favorites`.

จาก `toggle` และ `listMine` ที่อธิบายข้างต้น คาดว่า response ขั้นที่ 3 จะมี object ของหอนั้นพร้อม array `rooms` ที่รวมทั้งห้องที่ผ่านและยังไม่ผ่านการอนุมัติ ผลคาดนี้ไม่ใช่ผลการทดสอบที่สังเกตได้ และไม่ควรใช้กับระบบ production หรือข้อมูลผู้ใช้จริง การทดสอบ regression ที่เหมาะสมคือสร้างหออนุมัติหนึ่งแห่งที่มีห้อง `approved: true` และ `approved: false`, favorite หอนั้นด้วยบัญชีผู้เช่า, แล้วตรวจว่าผลลัพธ์ไม่มีห้องหลัง และยังคงมีห้องแรก

## Remediation

ควรทำให้ `FavoritesService` ส่ง public DTO ที่เลือกเฉพาะฟิลด์ที่หน้า favorites จำเป็นต้องใช้ แทนการคืน raw relation และใส่ตัวกรอง visibility ลงใน relation โดยตรง เช่นแนวทางนี้:

```ts
include: {
  dorm: {
    include: { rooms: { where: { approved: true } } },
  },
},
```

ตัวกรอง relation แก้ leak ของห้อง แต่ไม่ควรเป็น guard เดียว: ก่อนสร้าง favorite ให้ค้นหาหอด้วยเงื่อนไข `status: 'APPROVED'` และตอบปฏิเสธหรือ not found หากไม่ตรงเงื่อนไข วิธีนี้กันไม่ให้ favorites กลายเป็นรายการอ้างอิงถึงหอที่ไม่ควรแสดง และทำให้นโยบายมีผลตั้งแต่จุดรับ `dormId`.

`BookingsService.bookedRanges` ควรยืนยันก่อนว่าห้องที่ขอมี `approved: true` และหอที่เกี่ยวข้องมี `status: 'APPROVED'` แล้วจึงคืนช่วงวันที่ หรือให้ endpoint เรียกใช้ helper visibility เดียวกับ API ห้องสาธารณะ การเปลี่ยนนี้เป็น hardening ของ endpoint availability; ไม่ใช่การยืนยันว่ามีการเปิดเผยช่วงวันของห้องที่ยังไม่อนุมัติใน runtime.

เพิ่ม regression tests ที่ครอบคลุม (1) ผู้เช่าชื่นชอบหอที่อนุมัติแล้วและได้รับเฉพาะห้องที่อนุมัติ, (2) การ favorite หอที่ไม่อนุมัติถูกปฏิเสธ, (3) `GET /rooms/:id` ยังคงปฏิเสธห้องที่ไม่อนุมัติ, และ (4) availability ไม่คืนข้อมูลให้ room ที่ไม่ผ่าน visibility check. ยังไม่มีหลักฐานในซอร์สที่ตรวจว่าการแก้ไขนี้ถูก ship แล้ว

## Summary

ผู้เช่าที่มี JWT ของตนเองสามารถใช้ `dormId` สาธารณะเพื่อสร้าง favorite และให้ `FavoritesService.listMine` คืนห้องที่ `approved: false` เพราะ nested `rooms: true` ไม่มีตัวกรอง นี่ขัดกับ policy ที่ใช้แล้วใน public search และ direct room lookup แต่โค้ดการสร้าง booking ยังปฏิเสธห้องที่ไม่อนุมัติ จึงไม่ควรขยายผลกระทบไปถึงการจองหรือการเข้าถึงไฟล์

ซอร์สและประวัติที่ตรวจไม่ผูกพฤติกรรมนี้กับ release ที่เผยแพร่ หรือระบุ fix/backport ได้ การยืนยันต่อไปที่มีประโยชน์ที่สุดคือรัน regression test ใน environment ที่ได้รับอนุญาตด้วยหออนุมัติที่มีห้องรอตรวจ แล้วตรวจทั้ง response favorites และ availability หลังใช้ visibility policy ร่วมกัน.
