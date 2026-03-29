import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseDate = (date: any): Date => {
  if (!date) return new Date(0); // Epoch as fallback
  try {
    // Handle Firestore Timestamp or objects with toDate()
    if (date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    
    // Handle Date object (more robust check than instanceof)
    if (date instanceof Date || Object.prototype.toString.call(date) === '[object Date]') {
      // Check if it's a valid date
      if (isNaN(date.getTime())) return new Date(0);
      return date;
    }
    
    // Handle string
    if (typeof date === 'string') {
      if (!date.trim()) return new Date(0);
      // parseISO in date-fns v4 expects a string
      return parseISO(date);
    }
    
    // Handle number (timestamp in ms)
    if (typeof date === 'number') {
      const d = new Date(date);
      if (isNaN(d.getTime())) return new Date(0);
      return d;
    }
    
    // Handle objects that look like Timestamps but don't have toDate (e.g. from JSON)
    if (date && typeof date.seconds === 'number') {
      return new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
    }

    return new Date(0);
  } catch (error) {
    console.error("Error parsing date:", error, date);
    return new Date(0);
  }
};

export const formatDate = (date: any, formatStr: string = 'MMM d, yyyy') => {
  if (!date) return 'N/A';
  const d = parseDate(date);
  if (d.getTime() === 0) return 'N/A';
  return format(d, formatStr);
};

export const formatDateTime = (date: any) => {
  if (!date) return 'N/A';
  const d = parseDate(date);
  if (d.getTime() === 0) return 'N/A';
  return format(d, 'MMM d, h:mm a');
};
