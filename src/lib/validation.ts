/**
 * Validation utilities for runtime type checking and data validation
 */

import { z } from 'zod';

/**
 * Validates if a value is a valid URL
 */
export const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Schema for ticket data validation
 */
export const ticketSchema = z.object({
  ticket_id: z.string(),
  incident_number: z.string(),
  short_description: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  priority: z.union([z.number(), z.string()]).nullable().optional(),
  state: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  opened_at: z.string().nullable().optional(),
  closed_at: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

/**
 * Schema for KPI data validation
 */
export const kpiSchema = z.object({
  openIncidents: z.number(),
  avgResolutionTime: z.number(),
  p1Incidents: z.number(),
  satisfactionRate: z.number(),
});

/**
 * Validates API response data against a schema
 */
export function validateData<T>(data: unknown, schema: z.ZodSchema<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      throw new Error(`Data validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Sanitizes user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validates and sanitizes form input
 */
export const validateFormInput = (value: string, fieldName: string, required: boolean = true): string | null => {
  if (required && !value.trim()) {
    return `${fieldName} is required`;
  }
  
  if (value.length > 1000) {
    return `${fieldName} is too long (maximum 1000 characters)`;
  }
  
  return null;
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
};

/**
 * Checks if an object has all required properties
 */
export const hasRequiredProperties = <T extends object>(
  obj: unknown,
  requiredProps: (keyof T)[]
): obj is T => {
  if (!obj || typeof obj !== 'object') return false;
  return requiredProps.every(prop => prop in obj);
};

/**
 * Safe JSON parse with error handling
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
};
