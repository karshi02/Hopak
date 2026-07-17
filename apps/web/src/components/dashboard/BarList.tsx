interface BarListProps {
  data: { label: string; value: number }[];
}

export function BarList({ data }: BarListProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3" title={`${d.label}: ${d.value}`}>
          <span className="w-24 shrink-0 truncate text-sm text-[#52514e] dark:text-[#c3c2b7]">
            {d.label}
          </span>
          <div className="h-3 flex-1 rounded-full bg-[#e1e0d9] dark:bg-[#2c2c2a]">
            <div
              className="h-3 rounded-full bg-[#2a78d6] transition-[width] dark:bg-[#3987e5]"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm tabular-nums text-[#0b0b0b] dark:text-white">
            {d.value}
          </span>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-[#898781]">ยังไม่มีข้อมูล</p>}
    </div>
  );
}
