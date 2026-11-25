import React from 'react';
import { motion } from 'motion/react';

interface BookLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  caption?: string;
  className?: string;
}

export const BookLoader: React.FC<BookLoaderProps> = ({
  size = 'md',
  caption = 'Opening catalogue...',
  className = '',
}) => {
  const dimensions = {
    sm: { w: 64, h: 48, text: 'text-3xs' },
    md: { w: 96, h: 72, text: 'text-xs' },
    lg: { w: 130, h: 98, text: 'text-sm' },
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 select-none ${className}`}>
      {/* Animated Tactile Book Canvas */}
      <div className="relative" style={{ width: dimensions.w, height: dimensions.h }}>
        <svg
          viewBox="0 0 120 90"
          className="w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground Soft Shadow */}
          <ellipse cx="60" cy="82" rx="46" ry="5" className="fill-black/10 dark:fill-black/35" />

          {/* Hardcover Outer Spine Base */}
          <path
            d="M 12 70 Q 60 76 108 70 L 112 73 Q 60 81 8 73 Z"
            className="fill-[#9A3412] dark:fill-[#7C2D12]"
          />
          {/* Left Bookcloth Cover */}
          <path
            d="M 10 24 L 12 70 Q 60 76 60 76 L 60 30 Q 60 30 10 24 Z"
            className="fill-[#C2410C] dark:fill-[#9A3412]"
          />
          {/* Right Bookcloth Cover */}
          <path
            d="M 110 24 L 108 70 Q 60 76 60 76 L 60 30 Q 60 30 110 24 Z"
            className="fill-[#C2410C] dark:fill-[#9A3412]"
          />

          {/* Stack of Left Static Pages */}
          <path
            d="M 15 28 C 30 32 50 32 58 31 L 58 73 C 50 74 30 74 15 68 Z"
            className="fill-[#F4EFE6] dark:fill-[#252830] stroke-[#E2D9C8] dark:stroke-[#353A45]"
            strokeWidth="0.8"
          />
          {/* Stack of Right Static Pages */}
          <path
            d="M 105 28 C 90 32 70 32 62 31 L 62 73 C 70 74 90 74 105 68 Z"
            className="fill-[#F4EFE6] dark:fill-[#252830] stroke-[#E2D9C8] dark:stroke-[#353A45]"
            strokeWidth="0.8"
          />

          {/* Forest Green Ribbon Bookmark */}
          <path
            d="M 60 30 Q 60 52 64 66 L 60 62 L 56 66 Q 59 52 60 30 Z"
            className="fill-[#15803D]"
          />

          {/* Flipping Page 1 */}
          <motion.path
            d="M 60 31 C 80 28 95 28 103 28 L 103 70 C 95 72 80 72 60 74 Z"
            className="fill-[#FBF9F5] dark:fill-[#2D313C] stroke-[#E2D9C8] dark:stroke-[#3E4452]"
            strokeWidth="0.75"
            animate={{
              d: [
                "M 60 31 C 80 28 95 28 103 28 L 103 70 C 95 72 80 72 60 74 Z",
                "M 60 31 C 60 22 60 22 60 20 L 60 68 C 60 70 60 70 60 74 Z",
                "M 60 31 C 40 28 25 28 17 28 L 17 70 C 25 72 40 72 60 74 Z",
              ],
              opacity: [1, 0.95, 0.7],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.5, 1],
            }}
          />

          {/* Flipping Page 2 (Staggered offset) */}
          <motion.path
            d="M 60 31 C 80 28 95 28 103 28 L 103 70 C 95 72 80 72 60 74 Z"
            className="fill-[#FBF9F5] dark:fill-[#2D313C] stroke-[#E2D9C8] dark:stroke-[#3E4452]"
            strokeWidth="0.75"
            animate={{
              d: [
                "M 60 31 C 80 28 95 28 103 28 L 103 70 C 95 72 80 72 60 74 Z",
                "M 60 31 C 60 22 60 22 60 20 L 60 68 C 60 70 60 70 60 74 Z",
                "M 60 31 C 40 28 25 28 17 28 L 17 70 C 25 72 40 72 60 74 Z",
              ],
              opacity: [1, 0.95, 0.7],
            }}
            transition={{
              duration: 1.4,
              delay: 0.45,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.5, 1],
            }}
          />

          {/* Book Spine Center Stitching */}
          <line
            x1="60"
            y1="30"
            x2="60"
            y2="75"
            className="stroke-[#9A3412] dark:stroke-[#7C2D12]"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {caption && (
        <p className={`font-serif text-ink-secondary dark:text-ink-dark-secondary animate-pulse ${dimensions.text} tracking-wide text-center`}>
          {caption}
        </p>
      )}
    </div>
  );
};
