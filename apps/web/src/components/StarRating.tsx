export function StarRating({ rating, count }: { rating?: number | null; count?: number }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-ink-strong dark:text-white">
      <span className="text-warning">★</span>
      {rating.toFixed(1)}
      {typeof count === 'number' && count > 0 && <span className="font-normal text-ink-faint">({count})</span>}
    </span>
  );
}
