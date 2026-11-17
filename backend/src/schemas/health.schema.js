import { z } from 'zod';

export const healthCheckQuerySchema = z.object({
  verbose: z.enum(['true', 'false']).optional().default('false')
});

export default {
  healthCheckQuerySchema
};

