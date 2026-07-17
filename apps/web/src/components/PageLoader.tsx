const WORD = 'Hopak.com';
const DOTS = ['•', '•', '•'];

interface PageLoaderProps {
  fullScreen?: boolean;
}

export function PageLoader({ fullScreen = false }: PageLoaderProps) {
  const letters = WORD.split('').map((char, i) => ({ char, delay: `${i * 0.08}s` }));
  const wordDelay = letters.length * 0.08;

  const content = (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-24 w-16 sm:h-32 sm:w-20">
        <div
          className="absolute inset-0 flex select-none items-center justify-center font-sans text-8xl font-extrabold leading-none text-white opacity-[0.12] sm:text-9xl"
          style={{ animation: 'hopak-fade-pulse 2.2s ease-in-out infinite' }}
        >
          H
        </div>
        <div
          className="absolute inset-0 flex select-none items-center justify-center font-sans text-8xl font-extrabold leading-none text-white sm:text-9xl"
          style={{ animation: 'hopak-fill-up 2.4s cubic-bezier(0.65,0,0.35,1) infinite' }}
        >
          H
        </div>
      </div>

      <div className="flex font-sans text-xl font-bold tracking-wide text-white sm:text-2xl">
        {letters.map((l, i) => (
          <span
            key={i}
            className="inline-block whitespace-pre"
            style={{ animation: 'hopak-wave-jump 1.4s ease-in-out infinite', animationDelay: l.delay }}
          >
            {l.char}
          </span>
        ))}
        {DOTS.map((dot, i) => (
          <span
            key={i}
            className="inline-block whitespace-pre"
            style={{
              animation: 'hopak-wave-jump 1.4s ease-in-out infinite, hopak-dot-blink 1.4s ease-in-out infinite',
              animationDelay: `${wordDelay + i * 0.08}s`,
            }}
          >
            {dot}
          </span>
        ))}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#1e6fd9]">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-lg bg-[#1e6fd9] p-10">
      {content}
    </div>
  );
}
