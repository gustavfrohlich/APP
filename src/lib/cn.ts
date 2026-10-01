type ClassValue = string | false | null | undefined | 0;

/** Osztálynevek összefűzése (a hamis értékek kimaradnak). */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
