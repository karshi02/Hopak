type IconKey =
  | 'dash'
  | 'book'
  | 'home'
  | 'user'
  | 'money'
  | 'ad'
  | 'shield'
  | 'gear'
  | 'bell'
  | 'search'
  | 'logout'
  | 'chevron'
  | 'bed'
  | 'chat'
  | 'plus'
  | 'star';

const PATHS: Record<IconKey, string> = {
  dash: 'M4 13h6V4H4v9zM14 20h6V4h-6v16zM4 20h6v-5H4v5z',
  book: 'M4 4h16v16H4zM4 9h16M9 4v16',
  home: 'M4 11l8-6 8 6M6 10v9h12v-9',
  user: 'M12 8a3.4 3.4 0 100 6.8A3.4 3.4 0 0012 8zM5 20c0-3.3 3.1-5 7-5s7 1.7 7 5',
  money: 'M3 6h18v12H3zM12 9.4a2.6 2.6 0 100 5.2 2.6 2.6 0 000-5.2z',
  ad: 'M4 9v6h4l6 4V5l-6 4H4zM17 9a4 4 0 010 6',
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z',
  gear: 'M12 12a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM10.5 21a2 2 0 003 0',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.5-4.5',
  logout: 'M15 17l5-5-5-5M20 12H9M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3',
  chevron: 'M6 9l6 6 6-6',
  bed: 'M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6M3 14h18M7 10V8a1 1 0 011-1h3v3',
  chat: 'M4 5h16v11H8l-4 3V5z',
  plus: 'M12 5v14M5 12h14',
  star: 'M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8L12 3z',
};

export function AdminIcon({ name, size = 20, className }: { name: IconKey; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d={PATHS[name]}
        stroke="currentColor"
        strokeWidth={name === 'home' ? 2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
