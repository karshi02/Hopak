-- ผูก payment กับ charge/QR ของ payment gateway (Xendit) เพื่อ match webhook กลับมา
ALTER TABLE "Payment" ADD COLUMN "gatewayChargeId" TEXT;
CREATE UNIQUE INDEX "Payment_gatewayChargeId_key" ON "Payment"("gatewayChargeId");
