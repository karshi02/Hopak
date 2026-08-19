-- แบนเนอร์หน้าแรกหลายรูป [{ url, pos, zoom }]
ALTER TABLE "SiteSettings" ADD COLUMN "heroSlides" JSONB NOT NULL DEFAULT '[]';

-- ยกรูปเดิม (ถ้ามี) ขึ้นเป็นสไลด์แรก จะได้ไม่หายไปหลัง deploy
UPDATE "SiteSettings"
SET "heroSlides" = jsonb_build_array(jsonb_build_object('url', "heroImageUrl", 'pos', '50% 50%', 'zoom', 100))
WHERE "heroImageUrl" IS NOT NULL AND "heroSlides" = '[]'::jsonb;
