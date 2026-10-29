import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface BookCoverProps {
  title: string;
  author?: string;
  coverUrl?: string;
  variant?: 'portrait' | 'square' | 'thumb';
  className?: string;
  priority?: boolean;
}

const SPINE_COLORS = [
  'bg-[#3B2F2F]', 'bg-[#2F3B30]', 'bg-[#2F2F3B]',
  'bg-[#3B3020]', 'bg-[#20303B]', 'bg-[#3B2040]',
  'bg-[#1E3A34]', 'bg-[#3A1E1E]', 'bg-[#2A3520]',
];

function getSpineColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return SPINE_COLORS[Math.abs(hash) % SPINE_COLORS.length];
}

function Fallback({ title, author, className }: { title: string; author?: string; className?: string }) {
  const initial = title.trim().charAt(0).toUpperCase();
  const spineColor = getSpineColor(title);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between p-3 rounded',
        'select-none overflow-hidden relative',
        spineColor,
        className,
      )}
      aria-hidden="true"
    >
      <div className="w-full border-t border-white/20" />
      <span className="font-serif text-3xl font-light text-white/80 leading-none tracking-wider mt-1">
        {initial}
      </span>
      <div className="w-full text-center mt-auto pb-1">
        <p className="font-serif text-2xs text-white/70 leading-tight line-clamp-3 tracking-tight">
          {title}
        </p>
        {author && (
          <p className="text-2xs text-white/40 mt-0.5 leading-tight truncate">
            {author}
          </p>
        )}
      </div>
      <div className="w-full border-b border-white/20 mt-1" />
    </div>
  );
}

export function BookCover({ title, author, coverUrl, variant = 'portrait', className, priority = false }: BookCoverProps) {
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>(
    coverUrl ? 'loading' : 'error',
  );

  useEffect(() => {
    setImgState(coverUrl ? 'loading' : 'error');
  }, [coverUrl]);

  const aspectClass = variant === 'portrait'
    ? 'aspect-[2/3]'
    : variant === 'square'
    ? 'aspect-square'
    : 'aspect-[2/3]';

  if (!coverUrl || imgState === 'error') {
    return (
      <Fallback
        title={title}
        author={author}
        className={cn(aspectClass, className)}
      />
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded', aspectClass, className)}>
      {imgState === 'loading' && (
        <div className="absolute inset-0 skeleton" />
      )}
      <img
        src={coverUrl}
        alt={`Cover of ${title}${author ? ` by ${author}` : ''}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setImgState('loaded')}
        onError={() => setImgState('error')}
        className={cn(
          'w-full h-full object-cover rounded transition-opacity duration-slow',
          imgState === 'loaded' ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}

