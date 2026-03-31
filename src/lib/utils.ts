import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parse } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: any, formatStr: string = 'dd/MM/yyyy'): string {
  if (!dateStr) return 'N/A';
  try {
    const date = dateStr.toDate ? dateStr.toDate() : new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return format(date, formatStr);
  } catch (e) {
    return String(dateStr);
  }
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return dateStr;
  }
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}
