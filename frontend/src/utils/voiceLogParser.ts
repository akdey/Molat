// Spoken numbers converter for words -> digits fallback
const SMALL_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS_NUMBERS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

// Converts text with spoken numbers like "forty five" or "one hundred twenty" into numeric digits
export function wordsToNumbers(text: string): string {
  let normalized = text.toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\bto\b/gi, 'to')
    .replace(/\btoo\b/gi, 'two') // common speech recognition homophone
    .replace(/\bfor\b/gi, (match, offset, str) => {
      // If preceded by "page" or followed by "to", it might be "four"
      const before = str.slice(Math.max(0, offset - 10), offset);
      if (before.includes('page') || before.includes('from')) return '4';
      return match;
    });

  // Replace compound tens like "twenty five" -> "25", "one hundred twenty" -> "120"
  for (const [tenWord, tenVal] of Object.entries(TENS_NUMBERS)) {
    for (const [smallWord, smallVal] of Object.entries(SMALL_NUMBERS)) {
      const regex = new RegExp(`\\b${tenWord}\\s+${smallWord}\\b`, 'gi');
      normalized = normalized.replace(regex, String(tenVal + smallVal));
    }
    const tenRegex = new RegExp(`\\b${tenWord}\\b`, 'gi');
    normalized = normalized.replace(tenRegex, String(tenVal));
  }

  // Replace single small numbers
  for (const [word, val] of Object.entries(SMALL_NUMBERS)) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(wordRegex, String(val));
  }

  // Handle "hundred" e.g. "1 hundred 20" or "one hundred"
  normalized = normalized.replace(/(\d+)\s+hundred\s+(\d+)/gi, (_, h, rem) => {
    return String(Number(h) * 100 + Number(rem));
  });
  normalized = normalized.replace(/(\d+)\s+hundred/gi, (_, h) => {
    return String(Number(h) * 100);
  });
  normalized = normalized.replace(/\bhundred\s+(\d+)/gi, (_, rem) => {
    return String(100 + Number(rem));
  });
  normalized = normalized.replace(/\bhundred\b/gi, '100');

  return normalized;
}

export interface ParsedVoiceLog {
  startPage?: number;
  endPage?: number;
  pagesRead?: number;
  durationMinutes?: number;
  finishedBook?: boolean;
  rating?: number;
  sessionNote?: string;
  summary: string;
}

/**
 * Parses spoken speech into structured reading log attributes.
 *
 * Examples:
 * - "from page 45 to 80" -> start: 45, end: 80
 * - "page 120 to 150" -> start: 120, end: 150
 * - "from 15 to 45" -> start: 15, end: 45
 * - "read 25 pages" -> pagesRead: 25
 * - "up to page 90" -> endPage: 90
 * - "page 10 to 40 for 25 minutes note loved the chapter" -> start: 10, end: 40, duration: 25, note: "loved the chapter"
 */
export function parseVoiceLogCommand(rawSpeech: string, currentStartPage: number = 0): ParsedVoiceLog | null {
  if (!rawSpeech || !rawSpeech.trim()) return null;

  const preprocessed = wordsToNumbers(rawSpeech.trim());

  let startPage: number | undefined = undefined;
  let endPage: number | undefined = undefined;
  let pagesRead: number | undefined = undefined;
  let durationMinutes: number | undefined = undefined;
  let finishedBook: boolean | undefined = undefined;
  let rating: number | undefined = undefined;
  let sessionNote: string | undefined = undefined;

  // 1. Check for finished book
  if (/\b(finished(\s+the)?\s+book|completed(\s+the)?\s+book|done\s+with(\s+the)?\s+book|book\s+finished)\b/i.test(preprocessed)) {
    finishedBook = true;
  }

  // 2. Check for rating (e.g. "rated 5 stars", "5 star rating", "5 stars")
  const ratingMatch = preprocessed.match(/\b([1-5])\s*(?:star|stars)\b/i) ||
                      preprocessed.match(/\brating\s*(?:of|is)?\s*([1-5])\b/i);
  if (ratingMatch) {
    rating = parseInt(ratingMatch[1], 10);
  }

  // 3. Check for duration: e.g. "for 30 minutes", "30 mins", "in 45 minutes", "duration 20 min"
  const durationMatch = preprocessed.match(/\b(?:for|in|took|duration)\s+(\d+)\s*(?:mins?|minutes?|m)\b/i) ||
                        preprocessed.match(/\b(\d+)\s*(?:mins?|minutes?)\b/i);
  if (durationMatch) {
    durationMinutes = parseInt(durationMatch[1], 10);
  }

  // 4. Check for note / comment: e.g. "note: loved it", "thoughts ...", "comment ..."
  const noteMatch = rawSpeech.match(/\b(?:note|notes|thoughts?|reflection|comment):\s*(.+)$/i) ||
                    rawSpeech.match(/\b(?:note|notes|thoughts?|reflection|comment)\s+(?:that|is|was)?\s*(.+)$/i);
  if (noteMatch) {
    sessionNote = noteMatch[1].trim();
  }

  // 5. Check for explicit range: "from (page)? X to (page)? Y", "page X to (page)? Y", "X through Y", "X to Y"
  const rangeMatch = preprocessed.match(/(?:from\s+)?(?:page\s+)?(\d+)\s*(?:to|through|-|till|until)\s*(?:page\s+)?(\d+)/i);

  if (rangeMatch) {
    const p1 = parseInt(rangeMatch[1], 10);
    const p2 = parseInt(rangeMatch[2], 10);
    startPage = Math.min(p1, p2);
    endPage = Math.max(p1, p2);
    pagesRead = endPage - startPage;
  } else {
    // 6. Check for delta pages: "read 25 pages", "logged 30 pages", "30 pages"
    const deltaMatch = preprocessed.match(/\b(?:read|logged|did|read\s+about)?\s*(\d+)\s+pages?\b/i);
    if (deltaMatch) {
      pagesRead = parseInt(deltaMatch[1], 10);
      startPage = currentStartPage;
      endPage = currentStartPage + pagesRead;
    } else {
      // 7. Check for single end target: "up to page 80", "until page 80", "reached page 80", "finished at page 80", "page 80"
      const singleTargetMatch = preprocessed.match(/\b(?:up\s+to|until|reached|finished\s+at|at|ended\s+at|to|through)\s*(?:page)?\s*(\d+)\b/i) ||
                                preprocessed.match(/\bpage\s+(\d+)\b/i);
      if (singleTargetMatch) {
        const target = parseInt(singleTargetMatch[1], 10);
        if (target >= currentStartPage) {
          startPage = currentStartPage;
          endPage = target;
          pagesRead = endPage - startPage;
        } else {
          // If smaller than currentStartPage, maybe it was a delta
          pagesRead = target;
          startPage = currentStartPage;
          endPage = currentStartPage + target;
        }
      }
    }
  }

  // If we could not extract any page numbers or pagesRead or duration, return null
  if (startPage === undefined && endPage === undefined && pagesRead === undefined && durationMinutes === undefined) {
    return null;
  }

  // Build human friendly summary
  const summaryParts: string[] = [];
  if (startPage !== undefined && endPage !== undefined) {
    summaryParts.push(`Page ${startPage} → ${endPage} (${pagesRead} pgs)`);
  } else if (pagesRead !== undefined) {
    summaryParts.push(`+${pagesRead} pages`);
  }

  if (durationMinutes !== undefined) {
    summaryParts.push(`${durationMinutes} mins`);
  }

  if (finishedBook) {
    summaryParts.push('Finished Book 🎉');
  }

  if (rating !== undefined) {
    summaryParts.push(`${rating}★`);
  }

  return {
    startPage,
    endPage,
    pagesRead,
    durationMinutes,
    finishedBook,
    rating,
    sessionNote,
    summary: summaryParts.join(' • '),
  };
}
