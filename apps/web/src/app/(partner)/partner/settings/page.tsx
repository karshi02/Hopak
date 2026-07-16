'use client';

import { useState } from 'react';

export default function PartnerSettingsPage() {
  const [promptpayId, setPromptpayId] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold">ตั้งค่าบัญชีรับเงิน</h1>
      <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
        <input
          placeholder="เบอร์ PromptPay"
          value={promptpayId}
          onChange={(e) => setPromptpayId(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-green-600 px-4 py-2 text-white">
          บันทึก
        </button>
        {saved && <p className="text-sm text-green-700">บันทึกแล้ว</p>}
      </form>
    </div>
  );
}
