## Executive Summary

ซอร์สสแนปช็อตที่ประเมินมีความเสี่ยงที่คำขอโอน payout สองคำขอซึ่งทับซ้อนกัน จะใช้รายการชำระเงิน `SETTLED` ชุดเดียวกันและส่งคำสั่ง payout ออกไปสองครั้งได้ Mallory ในกรณีนี้ไม่ใช่ผู้ใช้ทั่วไป: เธอต้องเป็นผู้ดูแลระบบที่ล็อกอินอยู่จริงและมี `adminRole` เป็น `FINANCE` หรือ `SUPER_ADMIN` แล้วส่งคำขอไปยัง payout ของหอเดียวกันพร้อมกัน การคุ้มครองที่ควรมีคือยอด `SETTLED` หนึ่งชุดต้องถูกนำไปสร้างรอบโอนเพียงครั้งเดียว แต่โค้ดเลือกยอดก่อน เรียกผู้ให้บริการภายนอก และค่อยเปลี่ยนสถานะภายหลัง จึงไม่มีการจองยอดนั้นไว้ก่อนส่งเงินออก การโจมตีนี้ไม่ต้องขโมย session ไม่ได้เป็นการข้ามสิทธิ์จากผู้ใช้ที่ไม่ใช่ผู้ดูแล และไม่ใช่ข้อบกพร่องของการยืนยันตัวตน

ผลกระทบที่ซอร์สสนับสนุนคือความเป็นไปได้ที่จะสร้างคำขอ payout ภายนอกสองรายการสำหรับยอดเดียวกัน โดยแต่ละคำขอมี idempotency key คนละค่า หากทั้งสองรายการได้รับการยอมรับและดำเนินการโดยผู้ให้บริการ ผู้รับเงินอย่าง Alice อาจได้รับเงินซ้ำ ความสำเร็จของการโอนปลายทาง ความน่าเชื่อถือของจังหวะการแข่งขัน และลักษณะการหักล้าง/ปฏิเสธของผู้ให้บริการยังไม่ได้ทดสอบ จึงไม่อ้างว่าเกิดการโอนจริงหรือเกิดได้แน่นอนในสภาพแวดล้อมผลิต

รุ่นที่ประเมินคือซอร์สสแนปช็อตใน repository ที่ไม่มี release tag ครอบคลุมอยู่ ผลการตรวจประวัติพบว่าเส้นทาง payout ของ Xendit ถูกเพิ่มพร้อมความสามารถ payout ในการเปลี่ยนแปลงที่ไม่มีแท็ก แต่ไม่มีข้อมูล release/tag ที่ใช้ยืนยันรุ่นแรกที่ได้รับผลกระทบ รุ่นที่ได้รับผลกระทบ หรือรุ่นที่แก้ไขแล้ว ดังนั้น release history จึงไม่พร้อมสำหรับการยืนยันช่วงเวอร์ชัน ฉันตรวจซอร์สสแนปช็อตนี้และประวัติ Git ที่เกี่ยวข้องโดยตรง แต่ไม่ได้รัน PoC, ไม่ได้ส่งคำขอไปยังแอปพลิเคชัน และไม่ได้ติดต่อผู้ให้บริการ payout ภายนอก

## Background

`FinanceController` เปิด `POST /admin/finance/payouts/dorm/:dormId/transfer-xendit` เพื่อส่งต่อ `dormId`, ผู้ดูแลที่ล็อกอิน และจำนวนเงิน/ประเภทรายการเช่าให้ `transferForDormViaXendit` ใน `apps/api/src/modules/admin/finance/finance.controller.ts` (ซอร์สสแนปช็อตที่ประเมิน):

```ts
@UseGuards(JwtAuthGuard, RolesGuard, AdminRolesGuard)
@Roles('admin')
@AdminRoles('SUPER_ADMIN', 'FINANCE')
export class FinanceController {
```

`AdminRolesGuard` ยังตรวจทั้ง `user.role === 'admin'` และให้ `user.adminRole` อยู่ในรายการที่กำหนดไว้ จึงเป็นการจำกัดสิทธิ์จริงตามซอร์ส ไม่ควรนำรายงานนี้ไปตีความว่า tenant, owner หรือผู้ดูแลทั่วไปเรียกเส้นทางนี้ได้ Mallory ต้องมีบัญชีผู้ดูแลฝ่ายการเงินของตนเอง ส่วน Alice คือเจ้าของหอและบัญชีปลายทางที่ผูกกับหอนั้น

การทำงานต้องมีการตั้งค่า Xendit secret และเจ้าของหอต้องมีธนาคาร บัญชี และชื่อบัญชีที่รองรับ มิฉะนั้น service จะปฏิเสธก่อนสร้าง payout เราไม่ทราบว่าสภาพแวดล้อมใดเปิดใช้การตั้งค่านี้ หรือมีบัญชีจริงอยู่กี่แห่ง เป้าหมายด้านความถูกต้องของธุรกิจในกรณีที่ตั้งค่านี้พร้อมคือ ยอดชำระ `SETTLED` ของ Alice สำหรับรอบหนึ่งต้องสร้างคำสั่งโอนเพียงหนึ่งรายการ แม้คำขอจาก Mallory จะมาถึงพร้อมกัน

## Vulnerability Details

เมธอด `transferForDormViaXendit` ใน `apps/api/src/modules/admin/finance/finance.service.ts` เริ่มจากอ่าน payment ที่ยังเป็น `SETTLED` ของหอและประเภทเช่าที่เลือก แล้วคำนวณยอดจากผลการอ่านนั้น:

```ts
const payments = await this.prisma.payment.findMany({
  where: {
    status: 'SETTLED',
    booking: { room: { dormId }, ...(rentalType ? { rentalType } : {}) },
  },
});
const calculatedTotal = payments.reduce((sum, p) => sum + p.ownerPayout, 0);
```

ไม่มี transaction, lock หรือสถานะ `PROCESSING` ที่ผูกการอ่านนี้กับสิทธิ์ในการสร้าง payout ดังนั้นคำขอ A และ B ที่เริ่มก่อนการอัปเดตของอีกฝ่ายสามารถต่างอ่านรายการ `SETTLED` ชุดเดียวกันได้ ทั้งสองคำขอสร้าง reference ใหม่และเรียก `createPayout` ก่อนจะเปลี่ยนสถานะ payment:

```ts
const payoutRef = this.disbursement.freshReference(`dorm-${dormId}`);
const payout = await this.disbursement.createPayout({
  channelCode: channel,
  accountNumber: owner.bankAccountNumber,
  accountHolderName: owner.bankAccountName,
  amount: transferAmount,
  referenceId: payoutRef,
});
```

เฉพาะหลังจากรอผลของการเรียกภายนอกแล้ว โค้ดจึงอัปเดต ID ที่อ่านมาก่อนหน้า โดยเงื่อนไขมีเพียง `id in (...)` และไม่ได้กำหนดว่า row ต้องยังเป็น `SETTLED`:

```ts
await this.prisma.payment.updateMany({
  where: { id: { in: payments.map((p) => p.id) } },
  data: {
    status: 'TRANSFERRED',
    payoutId: payout.payoutId,
    payoutRef,
    payoutStatus: payout.status,
  },
});
```

ดังนั้นแม้คำขอหนึ่งจะอัปเดตก่อน คำขอที่สองยังสามารถอัปเดต payment เดิมภายหลังได้ และค่าข้อมูล payout ที่เก็บไว้จะเป็นของผู้ชนะรายหลัง แทนที่จะเป็นหลักฐานว่าคำขอที่สองถูกปฏิเสธ การตรวจประวัติซอร์สระบุว่า gateway และการเรียก payout ถูกนำเข้ามาพร้อมฟีเจอร์ Xendit payout ที่ไม่มีแท็ก และการแก้ไขภายหลังที่เพิ่ม `payoutId`, `payoutRef` และสถานะ webhook ยังคงรักษาลำดับ read → external payout → update นี้ไว้ ไม่มีการพบการแก้ไข race นี้ในประวัติที่ตรวจได้

`apps/api/src/modules/payments/gateway/disbursement.gateway.ts` ผูก idempotency key กับ reference ที่ caller ส่งมา:

```ts
'Idempotency-key': `payout-${params.referenceId}`,
```

แต่ `freshReference` สร้าง reference ด้วยเวลาและส่วนสุ่ม:

```ts
return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
```

จึงเป็นการป้องกัน retry ของคำขอเดียวที่ใช้ reference เดิม ไม่ใช่การทำให้คำขอสองคำขอสำหรับยอด payment ชุดเดียวกันใช้ idempotency key เดียวกัน

## Exploitability Analysis

primitive ที่พิสูจน์ได้จากซอร์สคือ finance administrator ที่มีสิทธิ์อยู่แล้วสามารถทำให้คำขอ payout สองคำขอมีช่วงเวลาที่ทั้งคู่เลือกยอด `SETTLED` เดียวกัน ก่อนคำขอใดจะเปลี่ยนสถานะเป็น `TRANSFERRED` คำขอแต่ละชุดจะส่ง payload ที่มีบัญชีปลายทางและยอดเดียวกันไปยัง endpoint payout ภายนอก พร้อม idempotency key ต่างกัน นี่ข้ามขอบเขตความถูกต้องของระบบบัญชี: ยอดของ Alice ควรถูกใช้เป็นฐานของรอบโอนเดียว แต่สามารถถูกนำไปขอ payout มากกว่าหนึ่งครั้งได้

อย่างไรก็ดี ซอร์สเพียงอย่างเดียวไม่ยืนยันว่าผู้ให้บริการจะรับทั้งสอง key, เงินจะถึงบัญชี Alice ทั้งสองครั้ง หรือ callback ภายหลังจะจัดการสถานะอย่างไร การมี `payoutStatus` และข้อความในซอร์สที่ระบุว่ารอ webhook ยืนยัน เป็นเหตุผลเพิ่มเติมที่ไม่ควรสรุปว่าเงินถึงปลายทางทันที การตรวจเชิงบวก/ลบในระบบที่รันจริงไม่ได้ทำ: ไม่มีการยืนยันคำขอปกติหนึ่งคำขอ, ไม่มีการส่งคำขอคู่ที่ควบคุมเวลา, และไม่มีการตรวจว่า key เดิมถูก deduplicate ขณะที่ key ต่างกันได้รับการรับจริง ดังนั้นการนำไปใช้ต้องถือว่าเป็นความเสี่ยงด้าน integrity ที่เป็นไปได้ ไม่ใช่ผลทดสอบการโอนซ้ำ

ข้อจำกัดสำคัญคือ Mallory ต้องมี credential ของ finance admin และต้องมีหอที่มี payment `SETTLED` กับการตั้งค่าบัญชีปลายทางครบ การควบคุมสิทธิ์ที่กล่าวไว้ข้างต้นตัดคำอธิบายทางเลือกว่าผู้ใช้ที่ไม่ผ่านสิทธิ์ทำรายการได้ แต่ไม่ตัดการแข่งขันระหว่างคำขอที่ผ่านสิทธิ์สองคำขอ เพราะไม่มีการ claim ยอดแบบอะตอมมิกก่อน external call

## Proof of Concept

ไม่มี PoC artifact และไม่มีการรัน PoC สำหรับรายงานนี้ เพื่อไม่ให้สร้างคำขอโอนออกหรือเปลี่ยนข้อมูลการเงิน คำอธิบายต่อไปนี้เป็นพฤติกรรมที่คาดหมายจากการอ่านซอร์ส ไม่ใช่คำสั่งที่ได้รันหรือผลที่สังเกตได้: ในระบบทดสอบแบบแยกขาดที่มี finance-admin ของ Mallory, หอของ Alice, payment `SETTLED` และผู้ให้บริการ payout จำลอง คำขอ `transfer-xendit` สองคำขอที่ส่งพร้อมกันสำหรับ `dormId` และ `rentalType` เดียวกัน คาดว่าทั้งคู่จะผ่าน `findMany` ก่อน update, สร้าง `payoutRef` คนละค่า และเรียก adapter payout สองครั้ง

ตัวควบคุมที่ควรมีในการทดสอบแก้ไขคือ (1) คำขอเดี่ยวต้องสร้าง batch และการเรียก adapter หนึ่งครั้ง, (2) คำขอคู่ที่จัดเวลาให้ชนกันต้องคงเหลือการเรียก adapter เพียงครั้งเดียว, (3) คำขอที่สองต้องได้รับผลว่า batch เดิมกำลังประมวลผลหรือเสร็จแล้ว, และ (4) การ retry หลัง timeout ต้องใช้ idempotency key เดิมของ batch ไม่ใช่สร้าง reference ใหม่ การทดสอบควรใช้ adapter จำลองและฐานข้อมูลทดสอบเท่านั้น แล้วล้าง payment, batch และบันทึกที่สร้างขึ้นหลังจบการทดสอบ

## Remediation

ก่อนเรียกผู้ให้บริการภายนอก ให้สร้างและบันทึก payout batch ที่มี reference ถาวรใน transaction เดียวกับการ claim payment ที่ยังเป็น `SETTLED` เท่านั้น ตัวอย่างเชิงโครงสร้างคือสร้าง batch สถานะ `PROCESSING` แล้วทำ conditional update โดยมีเงื่อนไขทั้ง `id` และ `status: 'SETTLED'`; ต้องตรวจจำนวน row ที่ claim ได้ว่าตรงกับจำนวนที่อ่านไว้ หากไม่ครบ ให้ยกเลิก transaction และไม่เรียก payout อีกครั้ง คำขอคู่ที่มาทีหลังควรพบ batch ที่มีอยู่และคืนสถานะนั้น ไม่ใช่เปิดรอบใหม่

ใช้ ID หรือ reference ที่บันทึกใน batch นั้นเป็นทั้ง `reference_id` และ idempotency key ที่คงที่ การ retry ที่เกิดจาก timeout หรือการกู้คืนงานจึงส่ง key เดิมได้อย่างปลอดภัย หลังผู้ให้บริการตอบกลับ ให้บันทึกผลลง batch และ payment ที่ claim แล้ว; กรณีผลไม่แน่ชัดควร reconcile กับผู้ให้บริการจาก reference เดิมก่อนอนุญาตให้ลองใหม่ หลีกเลี่ยงการถือ database transaction ข้าม network call แต่ต้องคง claim ที่ durable ไว้ก่อน call

เพิ่ม regression test สำหรับการส่งคำขอคู่ที่ถูกกั้นด้วย barrier ให้ยืนยันว่าเกิด batch/reference เดียวและเรียก gateway หนึ่งครั้ง รวมถึง test สำหรับ conditional claim ล้มเหลว, retry หลังความผิดพลาดของเครือข่าย และ callback ที่ล้มเหลว/ย้อนกลับ การเปลี่ยน `updateMany` หลัง call ให้มี status predicate อย่างเดียวช่วยป้องกันการเขียนทับข้อมูล แต่ไม่พอป้องกัน payout ซ้ำ เพราะ external call เกิดไปแล้วก่อนจุดนั้น

## Summary

ช่องโหว่นี้ต้องอาศัย finance admin หรือ super admin ที่ล็อกอินอยู่จริง, หอที่มี payment `SETTLED`, และการตั้งค่า payout ที่ใช้งานได้ ซอร์สแสดงว่าคำขอที่ทับซ้อนกันสามารถอ่านยอดเดียวกัน สร้าง reference/idempotency key ใหม่คนละค่า และเรียก payout ภายนอกก่อนมีการ claim หรือเปลี่ยนสถานะ จึงอาจทำให้มีคำขอโอนมากกว่าหนึ่งคำสั่งสำหรับยอดของ Alice ได้ ไม่มีการยืนยัน release ที่ได้รับผลกระทบหรือ release ที่แก้ไข เพราะประวัติ release/tag สำหรับซอร์สสแนปช็อตนี้ไม่พร้อม และไม่มีการรันเพื่อยืนยันการโอนจริง

การตรวจที่มีประโยชน์ที่สุดถัดไปคือทดสอบการชนกันกับ gateway จำลองหลังเพิ่ม persisted batch/atomic claim และยืนยันว่า retry ทุกเส้นทางใช้ idempotency key ที่ผูกกับ batch เดิมเสมอ
