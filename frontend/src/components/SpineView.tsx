import React from 'react';
import type { Book } from '../types/book';
import { useLibraryStore } from '../store/useLibraryStore';

interface SpineViewProps {
  books: Book[];
}

export const SpineView: React.FC<SpineViewProps> = ({ books }) => {
  const { setSelectedBook } = useLibraryStore();

  const getSpineColor = (index: number, genre?: string) => {
    const palette = [
      'bg-[#4A2E1B] text-[#F3EFEA] border-[#382111]', // Deep leather
      'bg-[#1E3A34] text-[#E8F0EC] border-[#132722]', // Forest cloth
      'bg-[#7A2A22] text-[#FDF4F2] border-[#5E1E17]', // Oxblood
      'bg-[#2A344A] text-[#ECF0F7] border-[#1C2434]', // Navy buckram
      'bg-[#8C6D3B] text-[#FBF8F2] border-[#6D542B]', // Aged Ochre
      'bg-[#38332E] text-[#EDE7DF] border-[#25211D]', // Charcoal calf
    ];
    return palette[index % palette.length];
  };

  return (
    <div className="space-y-6">
      {/* Wooden bookshelf container */}
      <div className="p-3 sm:p-5 rounded-2xl bg-[#3D2516] dark:bg-[#1C120B] border-4 border-[#2D1B10] shadow-inner">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3 items-end min-h-[220px] pb-2 border-b-8 border-[#2D1B10]">
          {books.map((book, idx) => {
            const spineStyle = getSpineColor(idx, book.genre);
            return (
              <button
                key={book.book_id}
                onClick={() => setSelectedBook(book)}
                className={`group relative flex flex-col justify-between p-2 rounded-t-sm border-t-2 border-x-2 shadow-md transition-all duration-200 hover:-translate-y-2 hover:shadow-xl text-left h-48 sm:h-52 w-full ${spineStyle}`}
                title={`${book.title} by ${book.authors || 'Unknown'}`}
              >
                {/* Gold tooling accent on top */}
                <div className="w-full border-t border-amber-300/40 pt-0.5 text-center">
                  <span className="text-3xs uppercase tracking-widest text-amber-200/80 font-mono">
                    {book.book_id}
                  </span>
                </div>

                {/* Vertical Book Spine Title */}
                <div className="my-auto py-2 flex items-center justify-center overflow-hidden w-full">
                  <span
                    className="font-serif text-2xs sm:text-xs font-medium tracking-tight text-center line-clamp-4 leading-tight writing-vertical-lr rotate-180 group-hover:text-amber-200 transition-colors"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    {book.title}
                  </span>
                </div>

                {/* Bottom author and condition pill */}
                <div className="w-full border-b border-amber-300/40 pb-0.5 text-center space-y-0.5">
                  <p className="text-3xs truncate opacity-80 font-sans">
                    {book.authors?.split(' ')[0] || ''}
                  </p>
                  <span className="inline-block px-1 rounded text-3xs font-mono bg-black/40 text-amber-100">
                    {book.reading_status.slice(0, 4)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-2xs text-center text-ink-muted">
        Tactile Spine View • Tap any volume to inspect 21-column metadata or update reading status
      </p>
    </div>
  );
};

