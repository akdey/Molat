/**
 * Molat (মলাট) — Chrome Built-in AI (window.ai / Gemini Nano) Integration
 *
 * Provides on-device, zero-latency, 100% private prompt execution for WhatsApp loan
 * reminders with intelligent tone crafting and graceful fallback to offline literary presets.
 */

export type ReminderTone = 'gentle' | 'playful' | 'casual' | 'literary' | 'formal';

export interface AiAvailability {
  supported: boolean;
  state: 'readily' | 'after-download' | 'no' | 'unsupported';
  label: string;
}

/**
 * Checks if Chrome Built-in AI (window.ai.languageModel / Gemini Nano) is available in current browser session.
 */
export async function checkChromeAiAvailability(): Promise<AiAvailability> {
  if (typeof window === 'undefined') {
    return { supported: false, state: 'unsupported', label: 'Server environment' };
  }

  const ai = (window as any).ai;
  if (!ai) {
    return { supported: false, state: 'unsupported', label: 'Preset Mode (Chrome Built-in AI not detected)' };
  }

  try {
    if (ai.languageModel?.capabilities) {
      const caps = await ai.languageModel.capabilities();
      if (caps.available === 'readily') {
        return { supported: true, state: 'readily', label: 'Chrome Built-in AI Active (Gemini Nano)' };
      } else if (caps.available === 'after-download') {
        return { supported: true, state: 'after-download', label: 'On-device Gemini Nano downloading...' };
      }
      return { supported: false, state: 'no', label: 'On-device model unavailable' };
    }

    // Experimental / legacy window.ai interface
    if (typeof ai.createTextSession === 'function' || typeof ai.canCreateTextSession === 'function') {
      return { supported: true, state: 'readily', label: 'Chrome Built-in AI Active' };
    }
  } catch (err) {
    console.warn('Error checking window.ai capabilities:', err);
  }

  return { supported: false, state: 'unsupported', label: 'Preset Mode' };
}

/**
 * Instant curated literary tone templates (100% offline, zero network required).
 */
export function getPresetReminder(params: {
  borrowerName: string;
  bookTitle: string;
  tone: ReminderTone;
  isOverdue?: boolean;
  dueDate?: string;
}): string {
  const { borrowerName, bookTitle, tone, isOverdue, dueDate } = params;
  const name = borrowerName.trim() || 'friend';
  const title = bookTitle.trim() || 'the book';

  if (isOverdue) {
    switch (tone) {
      case 'playful':
        return `Hey ${name}! Rumour has it my bookshelf is getting lonely without "${title}". Did you finish that plot twist yet? Let me know whenever we can reunite! 📚😄`;
      case 'casual':
        return `Hi ${name}! Gentle check-in on "${title}" (it was due back around ${dueDate || 'recently'}). No rush at all, just let me know when it’s good to hand it back!`;
      case 'formal':
        return `Hello ${name}, gentle reminder regarding "${title}" from my personal library, which was scheduled for return around ${dueDate || 'a few days ago'}. Please let me know when you can return it. Thanks!`;
      case 'literary':
        return `Greetings ${name}. A volume once lent is a sacred trust between bibliophiles. "${title}" was due around ${dueDate || 'recently'} — let me know when you've turned the final leaf so it may return to its shelf! 📖✨`;
      case 'gentle':
      default:
        return `Hi ${name}! Hope you're enjoying "${title}". Gentle ping since it was due around ${dueDate || 'recently'} — let me know whenever it's convenient for you to return it! 📚`;
    }
  }

  switch (tone) {
    case 'playful':
      return `Hey ${name}! How's "${title}" treating you so far? If it keeps you up reading all night, don't blame me! Let me know when you reach the end so we can discuss! 📚🎉`;
    case 'casual':
      return `Hey ${name}! Just checking in to see how you're liking "${title}". Take your time, just let me know whenever you're done with it!`;
    case 'formal':
      return `Hi ${name}, hope you are well. Just following up on "${title}" from my library collection. Please let me know whenever you have completed it.`;
    case 'literary':
      return `Dear ${name}, hoping the pages of "${title}" are treating you to an exquisite journey. Whenever you reach the closing chapter, let's exchange notes and pass it along! 📚🖋️`;
    case 'gentle':
    default:
      return `Hi ${name}! Hope you're enjoying reading "${title}". Just checking in from my personal library — let me know whenever you're ready to pass it back! 📚`;
  }
}

/**
 * Generates an on-device personalized message using window.ai (Chrome Built-in AI / Gemini Nano).
 * Falls back to curated presets if window.ai is unsupported or unavailable.
 */
export async function generateReminderWithAi(params: {
  borrowerName: string;
  bookTitle: string;
  tone: ReminderTone;
  isOverdue?: boolean;
  dueDate?: string;
  customPrompt?: string;
}): Promise<string> {
  const { borrowerName, bookTitle, tone, isOverdue, dueDate, customPrompt } = params;
  const ai = (window as any).ai;

  if (!ai) {
    return getPresetReminder(params);
  }

  try {
    let session: any = null;
    const systemPrompt = `You are a polite, cultured literary companion assisting a personal book collector. 
Draft a friendly, short WhatsApp message to a friend who borrowed a book.
Keep it under 3 sentences, natural, warm, and suitable for WhatsApp. Include 1 or 2 subtle literary emojis.`;

    if (ai.languageModel?.create) {
      session = await ai.languageModel.create({
        systemPrompt,
        temperature: 0.7,
      });
    } else if (ai.createTextSession) {
      session = await ai.createTextSession();
    }

    if (!session) {
      return getPresetReminder(params);
    }

    try {
      const prompt = `Write a ${tone} WhatsApp reminder to ${borrowerName} about the borrowed book "${bookTitle}".
${isOverdue ? `Note: The book is overdue (expected return was ${dueDate || 'recently'}).` : 'Note: The book is not overdue yet, just checking in.'}
${customPrompt && customPrompt.trim() ? `Additional user guidance: ${customPrompt.trim()}` : ''}
Respond ONLY with the WhatsApp message text, without quotation marks or conversational commentary.`;

      const result = await session.prompt(prompt);
      const clean = result.trim().replace(/^["']|["']$/g, '');
      return clean || getPresetReminder(params);
    } finally {
      if (typeof session.destroy === 'function') {
        session.destroy();
      }
    }
  } catch (err) {
    console.warn('window.ai generation encountered an error; falling back to preset:', err);
    return getPresetReminder(params);
  }
}
