// Utility functions for managing daily preview attempt counter

export interface DailyAttempts {
  date: string;
  count: number;
}

/**
 * Get current daily attempts from localStorage
 */
export function getDailyAttempts(): DailyAttempts {
  const today = new Date().toDateString();
  
  try {
    const saved = localStorage.getItem('taletoprint_daily_attempts');
    if (saved) {
      const { date, count } = JSON.parse(saved);
      if (date === today) {
        return { date, count };
      }
    }
  } catch (e) {
    console.error('Failed to load daily attempts:', e);
  }
  
  // Return fresh counter for today
  return { date: today, count: 0 };
}

/**
 * Save daily attempts to localStorage
 */
export function saveDailyAttempts(attempts: DailyAttempts): void {
  try {
    localStorage.setItem('taletoprint_daily_attempts', JSON.stringify(attempts));
  } catch (e) {
    console.error('Failed to save daily attempts:', e);
  }
}

/**
 * Reset daily attempts counter to 0 for today
 * Used after successful purchases to give users fresh previews
 */
export function resetDailyAttempts(): void {
  const today = new Date().toDateString();
  const freshAttempts: DailyAttempts = { date: today, count: 0 };
  saveDailyAttempts(freshAttempts);
}

/**
 * Increment daily attempts counter
 */
export function incrementDailyAttempts(): number {
  const current = getDailyAttempts();
  const updated: DailyAttempts = {
    date: current.date,
    count: current.count + 1
  };
  saveDailyAttempts(updated);
  return updated.count;
}

/**
 * Check if user has remaining free attempts today
 */
export function hasRemainingAttempts(maxAttempts: number = 3): boolean {
  const current = getDailyAttempts();
  return current.count < maxAttempts;
}