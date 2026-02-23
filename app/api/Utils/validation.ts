import { NextRequest } from 'next/server';
import { z, ZodError, type ZodType } from 'zod';
import { fail } from './response';

export function formatZodError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request payload.';

  const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message}`;
}

export async function parseJsonBody<T>(
  req: NextRequest,
  schema: ZodType<T>,
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return { success: false, response: fail('Invalid JSON body.', 400) };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, response: fail(formatZodError(parsed.error), 400) };
  }

  return { success: true, data: parsed.data };
}

export const nonEmptyStringSchema = z.string().trim().min(1);
