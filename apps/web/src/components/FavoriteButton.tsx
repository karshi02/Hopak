'use client';

import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

export function FavoriteButton({
  active,
  onToggle,
  className = 'absolute right-3 top-3',
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!getToken()) {
          router.push('/login');
          return;
        }
        onToggle();
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm dark:bg-black/60 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? '#EB4D3D' : 'none'}>
        <path
          d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4 6 4c2 0 3.5 1 4 2 .5-1 2-2 4-2 4 0 5.5 4 4 7.7-2.5 4.7-10 9.3-10 9.3z"
          stroke={active ? '#EB4D3D' : '#8A909B'}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
