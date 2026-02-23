import { z } from 'zod';
import { nonEmptyStringSchema } from './validation';

export const createUserBodySchema = z
  .object({
    email: z.string().email(),
    password: nonEmptyStringSchema,
    name: nonEmptyStringSchema.optional(),
    firstName: nonEmptyStringSchema,
    lastName: nonEmptyStringSchema,
  })
  .passthrough();

export const updateUserBodySchema = z
  .object({
    email: z.string().email().optional(),
    displayName: nonEmptyStringSchema.optional(),
  })
  .passthrough()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update.',
  });

export const createRecordBodySchema = z
  .object({
    userId: nonEmptyStringSchema,
    trackId: nonEmptyStringSchema,
    totalTime: z.number().finite(),
    lapTimes: z.array(z.number().finite()).min(1),
  })
  .passthrough();

export const updateRecordBodySchema = z
  .object({
    userId: nonEmptyStringSchema.optional(),
    trackId: nonEmptyStringSchema.optional(),
    totalTime: z.number().finite().optional(),
    lapTimes: z.array(z.number().finite()).min(1).optional(),
  })
  .passthrough()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update.',
  });

export const createSessionBodySchema = z.object({
  idToken: nonEmptyStringSchema,
});
