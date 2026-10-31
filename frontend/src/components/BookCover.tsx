import React, { useState } from 'react';
import type { ReadingStatus } from '../types/book';
import { StatusRibbon } from './StatusRibbon';

interface BookCoverProps {
  title: string;
  authors?: string;
  coverUrl?: string;
  readingStatus?: ReadingStatus;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const BookCover: React.FC<BookCoverProps> = ({
  title,
  authors,
  coverUrl,
  readingStatus,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const [is1x1Pixel, setIs1x1Pixel] = useState(false);

  // Status badge style helper
  const getStatusBadge = (status?: ReadingStatus) => {
    switch (status) {
      case 'READING':
        return 'bg-amber-700/80 text-amber-50';
      case 'COMPLETED':
        return 'bg-emerald-800/80 text-emerald-50';
      case 'UNREAD':
        return 'bg-stone-800/80 text-stone-200';
      case 'PAUSED':
        return 'bg-purple-900/80 text-purple-100';
      case 'ABANDONED':
        return 'bg-rose-900/80 text-rose-100';
      default:
        return 'bg-black/60 text-white';
    }
  };

  const showFallback = !coverUrl || imageError || is1x1Pixel;

  return (
    <div
      className={`relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-rule dark:bg-rule-dark select-none shadow-sm ${className}`}
    >
      {!showFallback ? (
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            // 1x1 pixel guard: Open Library or other CDNs returning a 1x1 empty GIF/PNG
            if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
              setIs1x1Pixel(true);
            }
          }}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
        />
      ) : (
        /* Typographic Bookcloth Fallback with bound spine */
        <div className="w-full h-full flex flex-col justify-between p-3 bg-gradient-to-b from-[#2B2724] to-[#1A1816] text-[#EDE8DF] border-l-4 border-accent border-y border-r border-white/10 text-center shadow-inner">
          <div className="flex items-center justify-between text-3xs text-[#A89F91] tracking-widest uppercase border-b border-white/15 pb-1">
            <span>Molat</span>
            <span className="font-mono">Vol.</span>
          </div>

          <div className="my-auto space-y-1.5 py-1">
            <span className="font-serif text-3xl font-light text-amber-200/90 block">
              {title.charAt(0).toUpperCase()}
            </span>
            <p className="font-serif text-xs font-medium leading-tight line-clamp-3 text-[#FAF7F2]">
              {title}
            </p>
            <div className="w-8 border-t border-amber-500/40 mx-auto my-1" />
            {authors && (
              <p className="text-3xs text-[#B8AFA2] uppercase tracking-wider truncate">
                {authors}
              </p>
            )}
          </div>

          <div className="border-t border-white/15 pt-1 text-3xs text-[#8A8175] tracking-widest uppercase font-mono">
            Personal Library
          </div>
        </div>
      )}

      {readingStatus && (
        <div className="absolute top-0 right-2 z-10">
          <StatusRibbon status={readingStatus} variant="bookmark" />
        </div>
      )}
    </div>
  );
};

