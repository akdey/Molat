import React, { useState } from 'react';
import type { ReadingStatus } from '../types/book';

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
        /* Typographic Bookcloth Fallback */
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-[#2D2A26] to-[#1C1A17] text-[#EDE8DF] border border-white/10 text-center">
          <div className="flex items-center justify-between text-3xs text-[#A89F91] tracking-widest uppercase border-b border-white/15 pb-1">
            <span>Ondorpata</span>
            <span>Ed.</span>
          </div>

          <div className="my-auto space-y-1.5 py-1">
            <span className="font-serif text-3xl font-normal text-amber-200/90 block">
              {title.charAt(0).toUpperCase()}
            </span>
            <p className="font-serif text-xs font-medium leading-tight line-clamp-3 text-[#FAF7F2]">
              {title}
            </p>
            {authors && (
              <p className="text-3xs text-[#B8AFA2] truncate pt-0.5">
                {authors}
              </p>
            )}
          </div>

          <div className="border-t border-white/15 pt-1 text-3xs text-[#8A8175] tracking-wider uppercase">
            Personal Library
          </div>
        </div>
      )}

      {readingStatus && (
        <span
          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-3xs font-medium tracking-wide uppercase backdrop-blur-md ${getStatusBadge(
            readingStatus
          )}`}
        >
          {readingStatus}
        </span>
      )}
    </div>
  );
};

