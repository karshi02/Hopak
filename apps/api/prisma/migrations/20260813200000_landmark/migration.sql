-- สถานที่สำคัญจาก Google Places (cache ไว้ใช้ซ้ำ — Places คิดเงินต่อการเรียก)
CREATE TABLE "Landmark" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "rating" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Landmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Landmark_placeId_key" ON "Landmark"("placeId");
CREATE INDEX "Landmark_province_district_idx" ON "Landmark"("province", "district");
