/**
 * Configuration validation utilities for application settings
 */

import { z } from 'zod';
import { isValidUrl } from './validation';

/**
 * Schema for system settings
 */
export const systemSettingsSchema = z.object({
  dataSource: z.enum(['docker', 'supabase']),
  apiBaseUrl: z.string().refine(isValidUrl, 'Invalid API URL'),
  authApiUrl: z.string().refine(isValidUrl, 'Invalid Auth API URL'),
  aiBackendUrl: z.string().optional().refine(
    (val) => !val || isValidUrl(val),
    'Invalid AI Backend URL'
  ),
});

/**
 * Schema for user preferences
 */
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultPage: z.string().optional(),
  pageSize: z.number().min(1).max(100).optional(),
  similarityThreshold: z.number().min(0).max(1).optional(),
  showDuplicates: z.boolean().optional(),
  showGraphs: z.boolean().optional(),
  defaultFilters: z.object({
    category: z.string().optional(),
    priority: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
});

/**
 * Combined settings schema
 */
export const settingsSchema = systemSettingsSchema.merge(
  z.object({
    userPreferences: userPreferencesSchema.optional(),
  })
);

export type SystemSettings = z.infer<typeof systemSettingsSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type Settings = z.infer<typeof settingsSchema>;

/**
 * Validates system settings
 */
export const validateSystemSettings = (settings: unknown): SystemSettings => {
  return systemSettingsSchema.parse(settings);
};

/**
 * Validates user preferences
 */
export const validateUserPreferences = (preferences: unknown): UserPreferences => {
  return userPreferencesSchema.parse(preferences);
};

/**
 * Validates complete settings object
 */
export const validateSettings = (settings: unknown): Settings => {
  return settingsSchema.parse(settings);
};

/**
 * Provides default settings
 */
export const getDefaultSettings = (): Settings => {
  return {
    dataSource: 'docker',
    apiBaseUrl: 'http://localhost:3000',
    authApiUrl: 'http://localhost:3001',
    aiBackendUrl: 'http://localhost:8000',
    userPreferences: {
      theme: 'system',
      pageSize: 20,
      similarityThreshold: 0.8,
      showDuplicates: true,
      showGraphs: true,
    },
  };
};

/**
 * Safely loads settings from localStorage with validation
 */
export const loadSettings = (key: string): Settings => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return getDefaultSettings();
    }

    const parsed = JSON.parse(stored);
    return validateSettings(parsed);
  } catch (error) {
    console.error('Failed to load settings, using defaults:', error);
    return getDefaultSettings();
  }
};

/**
 * Safely saves settings to localStorage with validation
 */
export const saveSettings = (key: string, settings: unknown): boolean => {
  try {
    const validated = validateSettings(settings);
    localStorage.setItem(key, JSON.stringify(validated));
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
};
