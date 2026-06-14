import { z } from 'zod';

export const dashboardAnalyticsZodSchema = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'year']).optional(),
  }),
});
