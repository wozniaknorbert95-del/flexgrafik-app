/**
 * Date Helper Utilities
 *
 * Pure functions for date manipulation and formatting.
 * Used throughout the application for consistent date handling.
 *
 * Timezone Support:
 * - All dates stored as UTC ISO strings in database
 * - All display functions convert to user's timezone
 * - DST (Daylight Saving Time) handled automatically by browser
 */

/**
 * Get user's timezone from settings or browser
 *
 * @param timezoneSettings - Optional timezone settings from user preferences
 * @returns IANA timezone identifier (e.g., "Europe/Warsaw")
 */
export function getUserTimezone(timezoneSettings?: { timezone?: string }): string {
  if (timezoneSettings?.timezone) {
    return timezoneSettings.timezone;
  }
  // Fallback to browser timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert UTC date to user's local timezone
 *
 * @param utcDate - Date in UTC (ISO string or Date object)
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Date object in user's timezone
 */
export function toUserTimezone(utcDate: Date | string, timezone?: string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Use Intl API for timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Check if DST (Daylight Saving Time) is active for a given date and timezone
 *
 * @param date - Date to check
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns True if DST is active
 */
export function isDSTActive(date: Date = new Date(), timezone?: string): boolean {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Get timezone offset for January (winter) and July (summer)
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);

  const janOffset = getTimezoneOffset(jan, tz);
  const julOffset = getTimezoneOffset(jul, tz);
  const currentOffset = getTimezoneOffset(date, tz);

  // DST is active if current offset differs from winter offset
  return currentOffset !== Math.min(janOffset, julOffset);
}

/**
 * Get timezone offset in minutes for a given date and timezone
 *
 * @param date - Date to check
 * @param timezone - IANA timezone identifier
 * @returns Offset in minutes from UTC
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
}

/**
 * Get tomorrow's date in YYYY-MM-DD format (in user's timezone)
 *
 * @param fromDate - Optional date to calculate from (defaults to today)
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Date string in YYYY-MM-DD format
 */
export function getTomorrowDate(fromDate?: Date, timezone?: string): string {
  const date = fromDate || new Date();
  const localDate = timezone ? toUserTimezone(date, timezone) : date;
  const tomorrow = new Date(localDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateISO(tomorrow);
}

/**
 * Get today's date in YYYY-MM-DD format (in user's timezone)
 *
 * @param date - Optional date (defaults to today)
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayDate(date?: Date, timezone?: string): string {
  const d = date || new Date();
  // Convert to user timezone if specified
  const localDate = timezone ? toUserTimezone(d, timezone) : d;
  return formatDateISO(localDate);
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 *
 * @param date - Date object or ISO string
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to human-readable string (e.g., "26 January 2026")
 *
 * @param date - Date object or ISO string
 * @param locale - Locale string (defaults to 'pl-PL')
 * @returns Formatted date string
 */
export function formatDateHuman(date: Date | string, locale: string = 'pl-PL'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date to short string (e.g., "26.01.2026")
 *
 * @param date - Date object or ISO string
 * @param locale - Locale string (defaults to 'pl-PL')
 * @returns Formatted date string
 */
export function formatDateShort(date: Date | string, locale: string = 'pl-PL'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Check if date is today
 *
 * @param date - Date to check (ISO string or Date)
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return formatDateISO(d) === formatDateISO(today);
}

/**
 * Check if date is tomorrow
 *
 * @param date - Date to check (ISO string or Date)
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns True if date is tomorrow
 */
export function isTomorrow(date: Date | string, timezone?: string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = getTomorrowDate(undefined, timezone);
  return formatDateISO(d) === tomorrow;
}

/**
 * Get yesterday's date in YYYY-MM-DD format (in user's timezone)
 *
 * @param fromDate - Optional date to calculate from (defaults to today)
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Date string in YYYY-MM-DD format
 */
export function getYesterdayDate(fromDate?: Date, timezone?: string): string {
  const date = fromDate || new Date();
  const localDate = timezone ? toUserTimezone(date, timezone) : date;
  const yesterday = new Date(localDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateISO(yesterday);
}

/**
 * Parse time string (HH:mm) to Date object (today)
 *
 * @param timeStr - Time in "HH:mm" format
 * @returns Date object with today's date and specified time
 */
export function parseTimeToDate(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
  }
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Format time from Date object to HH:mm string (in user's timezone)
 *
 * @param date - Date object (UTC or local)
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Time string in HH:mm format
 */
export function formatTime(date: Date, timezone?: string): string {
  const localDate = timezone ? toUserTimezone(date, timezone) : date;
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get current time in HH:mm format (in user's timezone)
 *
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Current time string
 */
export function getCurrentTime(timezone?: string): string {
  return formatTime(new Date(), timezone);
}

/**
 * Check if time is between two times (handles midnight crossover)
 *
 * @param time - Time to check (HH:mm)
 * @param start - Start time (HH:mm)
 * @param end - End time (HH:mm)
 * @returns True if time is within window
 */
export function isTimeInWindow(time: string, start: string, end: string): boolean {
  const [timeH, timeM] = time.split(':').map(Number);
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const timeMinutes = timeH * 60 + timeM;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle midnight crossover
  if (endMinutes < startMinutes) {
    return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
  }

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Get date N days from today (in user's timezone)
 *
 * @param days - Number of days to add (can be negative for past dates)
 * @param fromDate - Optional date to calculate from (defaults to today)
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateFromToday(days: number, fromDate?: Date, timezone?: string): string {
  const date = fromDate || new Date();
  const localDate = timezone ? toUserTimezone(date, timezone) : date;
  const targetDate = new Date(localDate);
  targetDate.setDate(targetDate.getDate() + days);
  return formatDateISO(targetDate);
}

/**
 * Check if date is within valid range for future protocols (max 7 days ahead)
 *
 * @param date - Date to check (ISO string or Date)
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns True if date is valid for future protocol (today to +7 days)
 */
export function isValidFutureProtocolDate(date: Date | string, timezone?: string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = getTodayDate(undefined, timezone);
  const maxFuture = getDateFromToday(7, undefined, timezone);
  const dateStr = formatDateISO(d);

  return dateStr >= today && dateStr <= maxFuture;
}

/**
 * Get list of available dates for protocol creation (today + next 7 days)
 *
 * @param timezone - Optional timezone (defaults to browser timezone)
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getAvailableProtocolDates(timezone?: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i <= 7; i++) {
    dates.push(getDateFromToday(i, undefined, timezone));
  }
  return dates;
}
