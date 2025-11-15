/**
 * Type declarations for formatters.js
 */

/**
 * Formats a number as currency with commas for thousands separator
 * @param amount - The number to format
 * @param currency - The currency symbol (optional)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency?: string, decimals?: number): string;

/**
 * Formats a number with commas for thousands separator
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals?: number): string;

/**
 * Formats a number as a percentage
 * @param value - The number to format (0.1 = 10%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals?: number): string;

/**
 * Formats file size in bytes to human readable format
 * @param bytes - The number of bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string;

/**
 * Formats a large number with K, M, B suffixes
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted compact number string
 */
export function formatCompactNumber(value: number, decimals?: number): string;

/**
 * Formats a date string
 * @param dateString - The date string to format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string;