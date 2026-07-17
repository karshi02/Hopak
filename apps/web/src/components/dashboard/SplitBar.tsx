const CATEGORICAL_LIGHT = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948'];

interface SplitBarProps {
  data: { label: string; value: number }[];
  maxSlots?: number;
}

export function SplitBar({ data, maxSlots = 5 }: SplitBarProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, maxSlots);
  const rest = sorted.slice(maxSlots);
  const restTotal = rest.reduce((sum, d) => sum + d.value, 0);
  const segments = restTotal > 0 ? [...top, { label: 'อื่นๆ', value: restTotal }] : top;
  const total = Math.max(1, segments.reduce((sum, d) => sum + d.value, 0));

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {segments.map((seg, i) => (
          <div
            key={seg.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(seg.value / total) * 100}%`,
              backgroundColor: seg.label === 'อื่นๆ' ? '#898781' : CATEGORICAL_LIGHT[i % 8],
            }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {segments.map((seg, i) => (
          <li key={seg.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[#52514e] dark:text-[#c3c2b7]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.label === 'อื่นๆ' ? '#898781' : CATEGORICAL_LIGHT[i % 8] }}
              />
              {seg.label}
            </span>
            <span className="tabular-nums text-[#0b0b0b] dark:text-white">
              {((seg.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
