/**
 * Formats a date string to YYYY-MM-DD format, handling timezone differences
 * @param dateString The date string to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
function createLocalDate(dateString: string): Date {
  // Create date in local timezone
  const [year, month, day] = dateString.split(/[-/T]/).map(Number);
  return new Date(year, month - 1, day, 12); // Use noon to avoid timezone issues
}

export function formatDateForInput(dateString: string): string {
  const date = createLocalDate(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateForDisplay(dateString: string): string {
  const date = createLocalDate(dateString);
  return date.toLocaleDateString();
}

export function getTodayForInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
