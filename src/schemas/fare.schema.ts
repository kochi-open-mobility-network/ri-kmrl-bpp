import { z } from 'zod';

export const fareSchema = z.object({
    fare_id: z.string(),
    price: z.string(),
    currency_type: z.string(),
    payment_method: z.string(),
    transfers: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type FareDataType = z.infer<typeof fareSchema>;