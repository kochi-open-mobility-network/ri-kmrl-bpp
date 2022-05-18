import {z} from 'zod';

export const itemSchema=z.object({
    id: z.string(),
    descriptor: z.object({
        name: z.string(),
        code: z.string(),
    }),
    fulfillment_id: z.string(),
    price: z.object({
        currency: z.string(),
        value: z.string(),
    }),
    matched: z.boolean(),
});

export type ItemDataType = z.infer<typeof itemSchema>;