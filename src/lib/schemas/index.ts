import { z } from 'zod';
import { NextResponse } from 'next/server';

export * from './invoice';
export * from './moxie';
export * from './billing';
export * from './org';
export * from './payments';
export * from './field-mappings';

/**
 * Validate data against a Zod schema. Returns either parsed data or validation error details.
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: string; details: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues;
  const first = issues[0];
  const message = first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
  return {
    success: false,
    error: message,
    details: issues,
  };
}

/**
 * Return a 400 JSON response for validation errors (for API routes).
 */
export function validationErrorResponse(result: { success: false; error: string; details: z.ZodIssue[] }) {
  return NextResponse.json(
    { error: result.error, details: result.details },
    { status: 400 }
  );
}
