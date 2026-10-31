import React from 'react';
import type { ReadingStatus } from '../types/book';

interface StatusRibbonProps {
  status: ReadingStatus;
  variant?: 'banner' | 'bookmark' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusRibbon: React.FC<StatusRibbonProps> = ({
  status,
  variant = 'banner',
  size = 'md',
  className = '',
}) => {
  // Silk color gradients & styles matching literary leather & cloth bindings
  const config = (() => {
    switch (status) {
      case 'READING':
        return {
          label: 'Currently Reading',
          shortLabel: 'Reading',
          gradient: 'from-amber-600 via-amber-700 to-amber-800 text-amber-50',
          dot: 'bg-amber-300 animate-pulse shadow-[0_0_8px_rgba(252,211,77,0.8)]',
          borderColor: 'border-amber-400/30',
          shadow: 'shadow-amber-950/30',
        };
      case 'COMPLETED':
        return {
          label: 'Completed',
          shortLabel: 'Read',
          gradient: 'from-emerald-700 via-emerald-800 to-emerald-900 text-emerald-50',
          dot: 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]',
          borderColor: 'border-emerald-400/30',
          shadow: 'shadow-emerald-950/30',
        };
      case 'PAUSED':
        return {
          label: 'Paused',
          shortLabel: 'Paused',
          gradient: 'from-purple-700 via-purple-800 to-purple-900 text-purple-50',
          dot: 'bg-purple-300 shadow-[0_0_8px_rgba(216,180,254,0.8)]',
          borderColor: 'border-purple-400/30',
          shadow: 'shadow-purple-950/30',
        };
      case 'ABANDONED':
        return {
          label: 'Abandoned',
          shortLabel: 'Abandoned',
          gradient: 'from-rose-700 via-rose-800 to-rose-900 text-rose-50',
          dot: 'bg-rose-300 shadow-[0_0_8px_rgba(253,164,175,0.8)]',
          borderColor: 'border-rose-400/30',
          shadow: 'shadow-rose-950/30',
        };
      case 'UNREAD':
      default:
        return {
          label: 'To Be Read',
          shortLabel: 'To Read',
          gradient: 'from-stone-600 via-stone-700 to-stone-800 text-stone-100',
          dot: 'bg-stone-300',
          borderColor: 'border-stone-400/30',
          shadow: 'shadow-stone-950/30',
        };
    }
  })();

  // 1. VERTICAL BOOKMARK RIBBON (hanging from top of cover / card)
  if (variant === 'bookmark') {
    return (
      <div
        className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] select-none pointer-events-none ${className}`}
        title={`Status: ${config.label}`}
      >
        <div
          className={`relative px-1.5 pt-1.5 pb-2.5 bg-gradient-to-b ${config.gradient} shadow-md border-x border-t ${config.borderColor}`}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 5px), 0 100%)',
          }}
        >
          {/* Subtle silk weave lines */}
          <div className="absolute inset-x-0 top-0 h-full opacity-15 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,white_2px,white_3px)] pointer-events-none" />
          <div className="flex flex-col items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span
              className="font-serif text-[8.5px] font-bold tracking-widest uppercase leading-none"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {config.shortLabel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. HORIZONTAL BANNER RIBBON (with swallowtail / dovetail notch on right)
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <div
      className={`relative inline-flex items-center select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)] ${className}`}
    >
      <div
        className={`relative inline-flex items-center gap-2 bg-gradient-to-r ${config.gradient} shadow-md border-y border-dashed ${config.borderColor} ${
          isSm
            ? 'px-2.5 py-0.5 text-3xs'
            : isLg
            ? 'px-4 py-1.5 text-xs'
            : 'px-3 py-1 text-2xs'
        } font-serif font-semibold tracking-wider uppercase`}
        style={{
          clipPath: 'polygon(0 0, calc(100% - 9px) 0, 100% 50%, calc(100% - 9px) 100%, 0 100%)',
          paddingRight: isSm ? '1rem' : isLg ? '1.5rem' : '1.25rem',
        }}
      >
        {/* Silk weave overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,white,transparent)] pointer-events-none" />

        {/* Breathing Dot */}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />

        <span className="drop-shadow-xs">{config.label}</span>
      </div>
    </div>
  );
};
