import type { Book, LendingRecord, StreakSummary } from '../types/book';
import { parseVoiceLogCommand } from './voiceLogParser';

export type AssistantIntent =
  | 'LOG_READING'
  | 'LOCATE_BOOK'
  | 'BOOK_STATUS'
  | 'CHECK_STREAK'
  | 'PICK_NEXT_READ'
  | 'LENDING_INFO'
  | 'UNKNOWN';

export interface AssistantResult {
  intent: AssistantIntent;
  matchedBook?: Book;
  spokenReply: string;
  cardTitle: string;
  cardDetail: string;
  actionPayload?: {
    bookId?: string;
    startPage?: number;
    endPage?: number;
    pagesRead?: number;
    durationMinutes?: number;
    sessionNote?: string;
    finishedBook?: boolean;
    rating?: number;
  };
  success: boolean;
}

// Levenshtein distance for fuzzy matching typos
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'to', 'for', 'by', 'and', 'on', 'with', 'book']);

function extractKeywords(title: string): string[] {
  return normalizeText(title)
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Finds the closest matching book from the user's in-memory library.
 * Handles speech recognition typos (e.g. "forth protocol" -> "The Fourth Protocol").
 */
export function fuzzyMatchBook(speech: string, books: Book[]): { book: Book; score: number } | null {
  if (!speech || books.length === 0) return null;

  const normalizedSpeech = normalizeText(speech);
  let bestMatch: Book | null = null;
  let highestScore = 0;

  for (const book of books) {
    const normTitle = normalizeText(book.title);
    if (!normTitle) continue;

    // 1. Direct exact or substring match
    if (normalizedSpeech.includes(normTitle)) {
      const score = 1.0 + (normTitle.length / 100);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = book;
      }
      continue;
    }

    // 2. Token overlap & fuzzy token distance
    const bookTokens = extractKeywords(book.title);
    if (bookTokens.length === 0) continue;

    const speechTokens = normalizedSpeech.split(' ');
    let matchedTokenCount = 0;

    for (const bToken of bookTokens) {
      let tokenFound = false;
      for (const sToken of speechTokens) {
        if (sToken === bToken) {
          tokenFound = true;
          break;
        }
        // Approximate match for slight phonetic differences (e.g. "forth" vs "fourth")
        const maxLen = Math.max(sToken.length, bToken.length);
        if (maxLen >= 4 && levenshteinDistance(sToken, bToken) <= 1) {
          tokenFound = true;
          break;
        }
      }
      if (tokenFound) matchedTokenCount++;
    }

    const tokenRatio = matchedTokenCount / bookTokens.length;

    // If more than half the distinctive words matched
    if (tokenRatio >= 0.5) {
      const score = tokenRatio + (matchedTokenCount * 0.1);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = book;
      }
    }
  }

  // Require reasonable confidence threshold
  if (bestMatch && highestScore >= 0.5) {
    return { book: bestMatch, score: highestScore };
  }

  return null;
}

/**
 * Global Voice Assistant Processor (100% Local on Device, Zero External APIs)
 */
export function processVoiceAssistantCommand(
  rawSpeech: string,
  context: {
    books: Book[];
    lendingRecords: LendingRecord[];
    streakSummary: StreakSummary | null;
  }
): AssistantResult {
  const speech = rawSpeech.trim();
  const lower = speech.toLowerCase();

  // 1. STREAK QUERY
  if (
    lower.includes('streak') ||
    lower.includes('reading streak') ||
    lower.includes('how many days') ||
    lower.includes('my streak')
  ) {
    const days = context.streakSummary?.current_streak_days ?? 0;
    const velocity = context.streakSummary?.reading_velocity_pages_per_day ?? 0;
    const longest = context.streakSummary?.longest_streak_days ?? 0;

    return {
      intent: 'CHECK_STREAK',
      success: true,
      cardTitle: `${days}-Day Reading Streak 🔥`,
      cardDetail: `Velocity: ${velocity} pgs/day • Longest record: ${longest} days`,
      spokenReply: `You are on a ${days}-day reading streak, reading an average of ${velocity} pages per day!`,
    };
  }

  // 2. PICK NEXT READ / RECOMMENDATION
  if (
    lower.includes('next read') ||
    lower.includes('what should i read') ||
    lower.includes('pick a book') ||
    lower.includes('recommend')
  ) {
    const unread = context.books.filter((b) => b.reading_status === 'UNREAD');
    if (unread.length === 0) {
      return {
        intent: 'PICK_NEXT_READ',
        success: false,
        cardTitle: 'Shelf Completed!',
        cardDetail: 'You have no unread books waiting on your shelf.',
        spokenReply: 'All the books on your shelf are completed or active! Consider adding a new one from your wishlist.',
      };
    }
    const chosen = unread[Math.floor(Math.random() * unread.length)];
    return {
      intent: 'PICK_NEXT_READ',
      matchedBook: chosen,
      success: true,
      cardTitle: `Next Read: "${chosen.title}"`,
      cardDetail: `By ${chosen.authors || 'Unknown'} • Located at ${chosen.location || 'Home Shelf'}`,
      spokenReply: `How about starting "${chosen.title}" by ${chosen.authors || 'its author'}? It is waiting on your ${chosen.location || 'Home Shelf'}.`,
    };
  }

  // 3. LOCATE BOOK ("Where is [Book]?", "Find [Book]")
  if (
    lower.startsWith('where is') ||
    lower.startsWith("where's") ||
    lower.startsWith('find') ||
    lower.startsWith('locate') ||
    lower.includes('which shelf')
  ) {
    const match = fuzzyMatchBook(speech, context.books);
    if (match) {
      const b = match.book;
      const loc = b.location || 'Home Shelf';
      const status = b.reading_status;
      return {
        intent: 'LOCATE_BOOK',
        matchedBook: b,
        success: true,
        cardTitle: `Located: ${b.title}`,
        cardDetail: `Shelf: ${loc} • Status: ${status}`,
        spokenReply: `"${b.title}" is located on ${loc}. Its current status is ${status}.`,
      };
    }
  }

  // 4. LENDING STATUS ("Who has [Book]?", "Did I lend [Book]?")
  if (lower.includes('who has') || lower.includes('borrowed') || lower.includes('lent')) {
    const match = fuzzyMatchBook(speech, context.books);
    if (match) {
      const b = match.book;
      const activeLoan = context.lendingRecords.find(
        (r) => r.book_id === b.book_id && r.status === 'ACTIVE'
      );
      if (activeLoan) {
        return {
          intent: 'LENDING_INFO',
          matchedBook: b,
          success: true,
          cardTitle: `Lent to ${activeLoan.borrower_name}`,
          cardDetail: `Due: ${activeLoan.due_date || 'No due date specified'}`,
          spokenReply: `"${b.title}" is currently lent to ${activeLoan.borrower_name}.`,
        };
      } else {
        return {
          intent: 'LENDING_INFO',
          matchedBook: b,
          success: true,
          cardTitle: `In Your Library: ${b.title}`,
          cardDetail: `Location: ${b.location || 'Home Shelf'} (Not currently lent out)`,
          spokenReply: `"${b.title}" is not currently lent out. It should be on your ${b.location || 'Home Shelf'}.`,
        };
      }
    }
  }

  // 5. LOG READING SESSION (Default & Core: "Log reading for [Book] from page X to Y")
  // First, fuzzy match the book from the library
  const matched = fuzzyMatchBook(speech, context.books);
  const parsedRange = parseVoiceLogCommand(speech, 0);

  if (matched && parsedRange) {
    const book = matched.book;
    const startP = parsedRange.startPage ?? 0;
    const endP = parsedRange.endPage ?? startP + (parsedRange.pagesRead ?? 0);
    const pages = Math.max(0, endP - startP);

    return {
      intent: 'LOG_READING',
      matchedBook: book,
      success: true,
      cardTitle: `Reading Logged: ${book.title}`,
      cardDetail: `Page ${startP} → ${endP} (+${pages} pgs)${
        parsedRange.durationMinutes ? ` • ${parsedRange.durationMinutes} mins` : ''
      }`,
      spokenReply: `Logged ${pages} pages for "${book.title}"! Page ${startP} to ${endP}.`,
      actionPayload: {
        bookId: book.book_id,
        startPage: startP,
        endPage: endP,
        pagesRead: pages,
        durationMinutes: parsedRange.durationMinutes ?? 0,
        sessionNote: parsedRange.sessionNote,
        finishedBook: parsedRange.finishedBook,
        rating: parsedRange.rating,
      },
    };
  }

  // If a book matched but no page range was detected
  if (matched && !parsedRange) {
    const b = matched.book;
    return {
      intent: 'BOOK_STATUS',
      matchedBook: b,
      success: true,
      cardTitle: b.title,
      cardDetail: `Status: ${b.reading_status} • Location: ${b.location || 'Home Shelf'}`,
      spokenReply: `Found "${b.title}". Status is ${b.reading_status} at ${b.location || 'Home Shelf'}. Say "Log page X to Y" to log reading.`,
    };
  }

  // 6. UNRECOGNIZED / FALLBACK
  return {
    intent: 'UNKNOWN',
    success: false,
    cardTitle: 'Voice Assistant',
    cardDetail: `Heard: "${speech}"`,
    spokenReply: `I heard "${speech}". Try saying: "Log reading for [Book] from page 45 to 80" or "Where is Dune?".`,
  };
}
