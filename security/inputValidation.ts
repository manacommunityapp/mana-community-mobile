import { z } from 'zod';

// Reusable validation schemas for all user inputs across the app.
// Uses Zod (already a dependency) for runtime type-safe validation.

const DANGEROUS_PATTERNS = /[<>"'`;(){}]/;

function sanitizeString(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const validators = {
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .max(254, 'Email is too long')
    .email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),

  phone: z
    .string()
    .trim()
    .min(10, 'Phone number is too short')
    .max(15, 'Phone number is too long')
    .regex(/^\+?[\d\s-]+$/, 'Invalid phone number'),

  name: z
    .string()
    .trim()
    .min(2, 'Name is too short')
    .max(100, 'Name is too long')
    .regex(/^[\p{L}\p{M}\s'.,-]+$/u, 'Name contains invalid characters'),

  freeText: z
    .string()
    .max(5000, 'Text is too long')
    .transform(sanitizeString),

  shortText: z
    .string()
    .max(500, 'Text is too long')
    .transform(sanitizeString),

  inviteCode: z
    .string()
    .trim()
    .min(4, 'Invite code is too short')
    .max(20, 'Invite code is too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid invite code format'),

  flatNumber: z
    .string()
    .trim()
    .max(20, 'Flat number is too long')
    .regex(/^[A-Za-z0-9\s/-]+$/, 'Invalid flat number'),

  block: z
    .string()
    .trim()
    .max(20, 'Block name is too long'),

  amount: z
    .number()
    .positive('Amount must be positive')
    .max(10_000_000, 'Amount exceeds maximum'),

  bidAmount: z
    .number()
    .positive('Bid must be positive')
    .max(100_000_000, 'Bid exceeds maximum'),

  url: z
    .string()
    .url('Invalid URL')
    .refine(
      (u) => u.startsWith('https://') || u.startsWith('http://'),
      'URL must use HTTP or HTTPS',
    ),

  id: z.number().int().positive('Invalid ID'),

  pageNumber: z.number().int().min(0).max(10_000),

  searchQuery: z
    .string()
    .max(200, 'Search query is too long')
    .transform((s) => s.replace(DANGEROUS_PATTERNS, '')),
} as const;

export const schemas = {
  login: z.object({
    identifier: validators.email,
    password: z.string().min(1, 'Password is required').max(128),
  }),

  register: z.object({
    fullName: validators.name,
    email: validators.email,
    phone: validators.phone,
    password: validators.password,
    inviteCode: validators.inviteCode,
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
    flatNo: validators.flatNumber,
    block: validators.block,
    dateOfBirth: z.string().optional(),
    userType: z.string().optional(),
    occupancyStatus: z.string().optional(),
    residentType: z.string().optional(),
    aadharNumber: z.string().max(12).regex(/^\d{12}$/, 'Invalid Aadhaar').optional(),
    emailOtpCode: z.string().max(6).optional(),
  }),

  createPost: z.object({
    content: validators.freeText.pipe(z.string().min(1, 'Content is required')),
    type: z.enum(['post', 'announcement', 'poll', 'event', 'job', 'marketplace']),
    mediaUrls: z.array(validators.url).max(10).optional(),
  }),

  createListing: z.object({
    title: validators.shortText.pipe(z.string().min(3, 'Title is too short')),
    description: validators.freeText.pipe(z.string().min(10, 'Description is too short')),
    price: z.number().min(0).max(10_000_000),
    isFree: z.boolean(),
    isNegotiable: z.boolean(),
    category: z.string(),
    condition: z.string(),
    imageUrls: z.array(validators.url).max(10),
  }),

  placeBid: z.object({
    amount: validators.bidAmount,
  }),

  emergencySOS: z.object({
    category: z.enum(['MEDICAL', 'FIRE', 'LIFT', 'SECURITY', 'GAS_LEAK', 'FLOOD']),
    description: validators.freeText.optional(),
    tower: z.string().max(20).optional(),
    flatNumber: validators.flatNumber.optional(),
    contactNumber: validators.phone.optional(),
  }),

  chatMessage: z.object({
    content: z.string().min(1).max(5000).transform(sanitizeString),
  }),

  createEvent: z.object({
    title: validators.shortText.pipe(z.string().min(3)),
    description: validators.freeText.optional(),
    startDate: z.string(),
    startTime: z.string(),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    location: z.string().max(200).optional(),
    venue: z.string().max(200).optional(),
    maxAttendees: z.number().int().positive().max(100_000).optional(),
    price: z.number().min(0).max(1_000_000).optional(),
  }),

  createJob: z.object({
    title: validators.shortText.pipe(z.string().min(3)),
    company: z.string().min(1).max(200),
    location: z.string().min(1).max(200),
    type: z.string(),
    description: validators.freeText.pipe(z.string().min(10)),
    requirements: z.array(z.string().max(500)).max(20).optional(),
    salaryRange: z.string().max(100).optional(),
    contactEmail: validators.email.optional(),
  }),
} as const;

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  const firstError = result.error.errors[0];
  return { success: false, error: firstError?.message ?? 'Validation failed' };
}

export { sanitizeString };
