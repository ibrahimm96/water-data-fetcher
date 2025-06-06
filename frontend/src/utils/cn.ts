import { clsx, type ClassValue } from 'clsx'

/**
 * Utility function to conditionally join classNames together
 * Combines clsx functionality for better TypeScript support
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}